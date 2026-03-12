use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex};
use tauri::Manager;
use tauri::window::Color;
use tauri_plugin_updater::UpdaterExt;

mod desktop_observer;
mod screen_ocr;
mod tray;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let observer_state = desktop_observer::init_observer_state();
    let paused_flag: Arc<AtomicBool> = Arc::new(AtomicBool::new(false));

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .manage(observer_state)
        .manage(paused_flag.clone())
        .invoke_handler(tauri::generate_handler![
            desktop_observer::check_accessibility,
            desktop_observer::request_accessibility,
            desktop_observer::get_observer_status,
            desktop_observer::get_current_context,
            desktop_observer::capture_context_now,
            desktop_observer::start_observing,
            desktop_observer::stop_observing,
            desktop_observer::check_screen_recording,
            desktop_observer::request_screen_recording,
        ])
        .setup(move |app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let window = app.get_webview_window("main").unwrap();
            window.set_background_color(Some(Color(0x1B, 0x1F, 0x3A, 0xFF))).ok();

            // Set up system tray — absorb errors; a missing tray is non-fatal
            if let Err(e) = tray::setup(app.handle(), paused_flag.clone()) {
                log::error!("[donna] Tray setup failed (app will continue without tray): {:?}", e);
            }

            // Check for updates in the background — non-blocking
            let update_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                // Small delay so the window is ready before any dialog appears
                tokio::time::sleep(std::time::Duration::from_secs(3)).await;
                match update_handle.updater() {
                    Ok(updater) => match updater.check().await {
                        Ok(Some(update)) => {
                            log::info!("[donna] Update available: {}", update.version);
                            let confirmed = tauri_plugin_dialog::DialogExt::dialog(&update_handle)
                                .message(format!(
                                    "Donna {} is available (you have {}). Install now?",
                                    update.version,
                                    update.current_version
                                ))
                                .title("Update Available")
                                .buttons(tauri_plugin_dialog::MessageDialogButtons::OkCancelCustom(
                                    "Install & Restart".to_string(),
                                    "Later".to_string(),
                                ))
                                .blocking_show();
                            if confirmed {
                                if let Err(e) = update.download_and_install(|_, _| {}, || {}).await {
                                    log::error!("[donna] Update install failed: {:?}", e);
                                } else {
                                    update_handle.restart();
                                }
                            }
                        }
                        Ok(None) => log::info!("[donna] App is up to date"),
                        Err(e) => log::warn!("[donna] Update check failed: {:?}", e),
                    },
                    Err(e) => log::warn!("[donna] Updater unavailable: {:?}", e),
                }
            });

            // Auto-start observer if accessibility permission is granted
            #[cfg(target_os = "macos")]
            {
                let handle = app.handle().clone();
                let state: tauri::State<'_, Arc<Mutex<desktop_observer::ObserverState>>> =
                    app.state();
                if desktop_observer::check_accessibility() {
                    desktop_observer::start_observer_loop(
                        handle,
                        state.inner().clone(),
                        paused_flag.clone(),
                    );
                    log::info!("[donna] Desktop observer auto-started");
                } else {
                    log::info!("[donna] Accessibility permission not granted — observer not started");
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
