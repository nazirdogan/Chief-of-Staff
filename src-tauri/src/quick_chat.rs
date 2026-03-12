/// Quick-chat global shortcut: Option+Space (⌥Space) toggles the overlay window.
///
/// Uses `tauri-plugin-global-shortcut` — the official Tauri 2.x global shortcut
/// plugin.  Window show/hide is dispatched to the main thread via
/// `run_on_main_thread` as required by macOS Cocoa.
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

pub fn register_shortcut(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // Option+Space  (Alt = Option on macOS)
    let shortcut = Shortcut::new(Some(Modifiers::ALT), Code::Space);

    app.global_shortcut().on_shortcut(shortcut, |app_handle, _shortcut, event| {
        if event.state == ShortcutState::Pressed {
            let handle = app_handle.clone();
            let _ = app_handle.run_on_main_thread(move || {
                toggle_quick_chat(&handle);
            });
        }
    })?;

    log::info!("[donna] Global shortcut ⌥Space registered");
    Ok(())
}

fn toggle_quick_chat(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("quick-chat") {
        match win.is_visible() {
            Ok(true) => {
                let _ = win.hide();
            }
            _ => {
                let _ = win.show();
                let _ = win.set_focus();
            }
        }
    } else {
        log::warn!("[donna] quick-chat window not found");
    }
}

/// Called by the frontend quick-chat page when the user submits a message.
/// Hides the overlay, brings the main window to front, and forwards the
/// message text via a Tauri event so the main window can open /chat.
#[tauri::command]
pub fn send_to_main_chat(app: AppHandle, message: String) {
    if let Some(qw) = app.get_webview_window("quick-chat") {
        let _ = qw.hide();
    }
    if let Some(mw) = app.get_webview_window("main") {
        let _ = mw.show();
        let _ = mw.set_focus();
        let _ = mw.emit("donna-quick-message", &message);
    }
}

/// Called by the frontend to hide the quick-chat overlay (Escape key).
#[tauri::command]
pub fn hide_quick_chat(app: AppHandle) {
    if let Some(win) = app.get_webview_window("quick-chat") {
        let _ = win.hide();
    }
}
