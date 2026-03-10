use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};
use tauri::image::Image;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};

// ─── State ────────────────────────────────────────────────────────────────────

pub struct TrayState {
    pub paused_until: Option<Instant>,
    pub excluded_apps: Vec<String>,
}

impl TrayState {
    pub fn new() -> Self {
        TrayState {
            paused_until: None,
            excluded_apps: Vec::new(),
        }
    }

    pub fn is_paused(&self) -> bool {
        match self.paused_until {
            Some(until) => Instant::now() < until,
            None => false,
        }
    }

    /// Remaining pause duration in whole minutes (0 if not paused).
    pub fn remaining_minutes(&self) -> u64 {
        match self.paused_until {
            Some(until) => {
                let now = Instant::now();
                if now < until {
                    let secs = (until - now).as_secs();
                    (secs + 59) / 60 // ceiling
                } else {
                    0
                }
            }
            None => 0,
        }
    }
}

// ─── Menu Builder ─────────────────────────────────────────────────────────────

fn build_menu(app: &AppHandle, tray_state: &TrayState) -> tauri::Result<Menu<tauri::Wry>> {
    let menu = Menu::new(app)?;

    let open = MenuItem::with_id(app, "donna-open", "Open Donna", true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "donna-settings", "Settings", true, None::<&str>)?;
    let sep1 = PredefinedMenuItem::separator(app)?;

    menu.append(&open)?;
    menu.append(&settings)?;
    menu.append(&sep1)?;

    if tray_state.is_paused() {
        let mins = tray_state.remaining_minutes();
        let label = format!("Resume ({} min remaining)", mins);
        let resume = MenuItem::with_id(app, "donna-resume", &label, true, None::<&str>)?;
        menu.append(&resume)?;
    } else {
        let pause_5 = MenuItem::with_id(app, "donna-pause-5", "5 minutes", true, None::<&str>)?;
        let pause_15 = MenuItem::with_id(app, "donna-pause-15", "15 minutes", true, None::<&str>)?;
        let pause_30 = MenuItem::with_id(app, "donna-pause-30", "30 minutes", true, None::<&str>)?;
        let pause_60 = MenuItem::with_id(app, "donna-pause-60", "1 hour", true, None::<&str>)?;
        let pause_launch = MenuItem::with_id(app, "donna-pause-launch", "Until next launch", true, None::<&str>)?;

        let pause_sub = Submenu::with_id_and_items(
            app,
            "donna-pause-menu",
            "Pause Context Collection",
            true,
            &[
                &pause_5,
                &pause_15,
                &pause_30,
                &pause_60,
                &pause_launch,
            ],
        )?;
        menu.append(&pause_sub)?;
    }

    let sep2 = PredefinedMenuItem::separator(app)?;
    let exclude = MenuItem::with_id(app, "donna-exclude", "Exclude Current App", true, None::<&str>)?;
    let sep3 = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "donna-quit", "Quit Donna", true, None::<&str>)?;

    menu.append(&sep2)?;
    menu.append(&exclude)?;
    menu.append(&sep3)?;
    menu.append(&quit)?;

    Ok(menu)
}

// ─── Tray Setup ───────────────────────────────────────────────────────────────

pub fn setup(app: &AppHandle, paused_flag: Arc<AtomicBool>) -> tauri::Result<()> {
    let tray_state = Arc::new(Mutex::new(TrayState::new()));
    app.manage(tray_state.clone());

    let icon = load_tray_icon(app, false);

    let state_ref = tray_state.lock().unwrap();
    let menu = build_menu(app, &state_ref)?;
    drop(state_ref);

    TrayIconBuilder::with_id("donna")
        .icon(icon)
        .icon_as_template(true)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .tooltip("Donna — AI Intelligence")
        .on_menu_event({
            let app = app.clone();
            let tray_state = tray_state.clone();
            let paused_flag = paused_flag.clone();
            move |_tray, event| {
                handle_menu_event(&app, &tray_state, &paused_flag, event.id().as_ref());
            }
        })
        .on_tray_icon_event({
            let app = app.clone();
            move |_tray, event| {
                if let TrayIconEvent::Click {
                    button: tauri::tray::MouseButton::Left,
                    button_state: tauri::tray::MouseButtonState::Up,
                    ..
                } = event
                {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
        })
        .build(app)?;

    Ok(())
}

// ─── Menu Event Handler ───────────────────────────────────────────────────────

fn handle_menu_event(
    app: &AppHandle,
    tray_state: &Arc<Mutex<TrayState>>,
    paused_flag: &Arc<AtomicBool>,
    event_id: &str,
) {
    match event_id {
        "donna-open" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        "donna-settings" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
                let _ = app.emit("navigate-to", "/settings");
            }
        }
        "donna-pause-5" => apply_pause(app, tray_state, paused_flag, Some(Duration::from_secs(5 * 60))),
        "donna-pause-15" => apply_pause(app, tray_state, paused_flag, Some(Duration::from_secs(15 * 60))),
        "donna-pause-30" => apply_pause(app, tray_state, paused_flag, Some(Duration::from_secs(30 * 60))),
        "donna-pause-60" => apply_pause(app, tray_state, paused_flag, Some(Duration::from_secs(60 * 60))),
        "donna-pause-launch" => apply_pause(app, tray_state, paused_flag, None),
        "donna-resume" => {
            let mut state = tray_state.lock().unwrap();
            state.paused_until = None;
            paused_flag.store(false, Ordering::Relaxed);
            drop(state);
            rebuild_tray_menu(app, tray_state, false);
            emit_tray_state(app, tray_state);
            log::info!("[tray] Observation resumed");
        }
        "donna-exclude" => {
            // Get the currently active app name from last observer context
            // Emit event so the TypeScript side can handle the exclusion
            let _ = app.emit("tray-exclude-current-app", ());
        }
        "donna-quit" => {
            app.exit(0);
        }
        _ => {}
    }
}

fn apply_pause(
    app: &AppHandle,
    tray_state: &Arc<Mutex<TrayState>>,
    paused_flag: &Arc<AtomicBool>,
    duration: Option<Duration>,
) {
    let mut state = tray_state.lock().unwrap();
    match duration {
        Some(d) => {
            state.paused_until = Some(Instant::now() + d);
            log::info!("[tray] Paused for {} minutes", d.as_secs() / 60);
        }
        None => {
            // Pause until next launch — set to a very long duration (30 days)
            state.paused_until = Some(Instant::now() + Duration::from_secs(30 * 24 * 60 * 60));
            log::info!("[tray] Paused until next launch");
        }
    }
    paused_flag.store(true, Ordering::Relaxed);
    drop(state);
    rebuild_tray_menu(app, tray_state, true);
    emit_tray_state(app, tray_state);
}

// ─── Tray Rebuild ─────────────────────────────────────────────────────────────

pub fn rebuild_tray_menu(app: &AppHandle, tray_state: &Arc<Mutex<TrayState>>, paused: bool) {
    if let Some(tray) = app.tray_by_id("donna") {
        let state = tray_state.lock().unwrap();
        if let Ok(menu) = build_menu(app, &state) {
            let _ = tray.set_menu(Some(menu));
        }
        let icon = load_tray_icon(app, paused);
        let _ = tray.set_icon(Some(icon));
        let tooltip = if paused {
            let mins = state.remaining_minutes();
            if mins > 60 {
                "Donna — Paused (until next launch)".to_string()
            } else {
                format!("Donna — Paused ({} min remaining)", mins)
            }
        } else {
            "Donna — AI Intelligence".to_string()
        };
        let _ = tray.set_tooltip(Some(&tooltip));
    }
}

// ─── Tray State Emission ──────────────────────────────────────────────────────

pub fn emit_tray_state(app: &AppHandle, tray_state: &Arc<Mutex<TrayState>>) {
    let state = tray_state.lock().unwrap();
    let paused = state.is_paused();
    let resumes_at_ms: Option<u64> = state.paused_until.map(|until| {
        let now = Instant::now();
        if until > now {
            // Convert to approximate unix ms
            let remaining_ms = (until - now).as_millis() as u64;
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64
                + remaining_ms
        } else {
            0
        }
    });
    drop(state);

    let _ = app.emit("tray-state-changed", serde_json::json!({
        "paused": paused,
        "resumes_at_ms": resumes_at_ms,
    }));
}

// ─── Icon Loader ──────────────────────────────────────────────────────────────

// Embed the default icon at compile time — guaranteed to be available at runtime,
// eliminating all runtime path resolution and any possibility of a panic.
static DEFAULT_ICON_BYTES: &[u8] = include_bytes!("../icons/32x32.png");

fn load_tray_icon(_app: &AppHandle, _paused: bool) -> Image<'static> {
    // Bytes are embedded at compile time from a verified PNG file.
    // This is guaranteed not to panic as long as 32x32.png is a valid PNG.
    // We use the same icon for both states until dedicated tray icons are added.
    Image::from_bytes(DEFAULT_ICON_BYTES)
        .expect("compile-time embedded 32x32.png must be a valid PNG")
}

// ─── Pause Check (called from observer loop) ──────────────────────────────────

/// Called periodically from the observer to expire timed pauses.
/// Returns whether the observer is currently paused.
pub fn check_pause_expired(app: &AppHandle, tray_state: &Arc<Mutex<TrayState>>, paused_flag: &Arc<AtomicBool>) -> bool {
    let mut state = tray_state.lock().unwrap();
    if state.paused_until.is_some() && !state.is_paused() {
        // Pause has expired — auto-resume
        state.paused_until = None;
        paused_flag.store(false, Ordering::Relaxed);
        drop(state);
        rebuild_tray_menu(app, tray_state, false);
        emit_tray_state(app, tray_state);
        log::info!("[tray] Pause expired — observation resumed");
        return false;
    }
    let still_paused = state.is_paused();
    drop(state);
    still_paused
}
