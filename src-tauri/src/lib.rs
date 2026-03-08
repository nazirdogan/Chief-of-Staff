use std::sync::{Arc, Mutex};
use tauri::Manager;
use tauri::window::Color;

mod desktop_observer;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let observer_state = desktop_observer::init_observer_state();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .manage(observer_state)
        .invoke_handler(tauri::generate_handler![
            desktop_observer::check_accessibility,
            desktop_observer::request_accessibility,
            desktop_observer::get_observer_status,
            desktop_observer::get_current_context,
            desktop_observer::capture_context_now,
            desktop_observer::start_observing,
            desktop_observer::stop_observing,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let window = app.get_webview_window("main").unwrap();
            window.set_background_color(Some(Color(0x1B, 0x1F, 0x3A, 0xFF))).ok();

            // Auto-start observer if accessibility permission is granted
            #[cfg(target_os = "macos")]
            {
                let handle = app.handle().clone();
                let state: tauri::State<'_, Arc<Mutex<desktop_observer::ObserverState>>> =
                    app.state();
                if desktop_observer::check_accessibility() {
                    desktop_observer::start_observer_loop(handle, state.inner().clone());
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
