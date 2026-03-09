use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};

// ─── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DesktopContext {
    pub timestamp: u64,
    pub active_app: String,
    pub bundle_id: String,
    pub window_title: String,
    pub focused_text: String,
    pub selected_text: String,
    pub visible_text: Vec<String>,
    pub clipboard_text: String,
    pub activity_type: String, // reading, writing, browsing, communicating, coding, designing
    pub url: Option<String>,   // browser URL if available
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObserverStatus {
    pub running: bool,
    pub has_accessibility_permission: bool,
    pub apps_observed: u64,
    pub context_changes_emitted: u64,
    pub last_context: Option<DesktopContext>,
}

pub struct ObserverState {
    pub running: bool,
    pub last_context: Option<DesktopContext>,
    pub apps_observed: u64,
    pub context_changes_emitted: u64,
}

// ─── macOS Accessibility FFI ──────────────────────────────────────────────────

#[cfg(target_os = "macos")]
mod macos {
    use core_foundation::base::{CFRelease, CFTypeRef, TCFType};
    use core_foundation::string::{CFString, CFStringRef};
    use core_foundation::array::CFArray;
    use core_foundation::boolean::CFBoolean;
    use core_foundation::number::CFNumber;
    use core_foundation::dictionary::CFDictionary;
    use std::ffi::c_void;
    use std::ptr;

    pub type AXUIElementRef = CFTypeRef;
    pub type AXError = i32;

    pub const K_AX_ERROR_SUCCESS: AXError = 0;

    // CFType IDs for runtime type checking
    extern "C" {
        fn CFGetTypeID(cf: CFTypeRef) -> u64;
        fn CFStringGetTypeID() -> u64;
    }

    /// Safely convert a CFTypeRef to a String, returning None if it's not a CFString.
    /// This prevents crashes when AX attributes return non-string types (CFNumber, etc.).
    ///
    /// IMPORTANT: This does NOT release the input ref. The caller must release it
    /// separately if it was obtained via a Copy/Create function.
    pub unsafe fn cftype_to_string(cf_ref: CFTypeRef) -> Option<String> {
        if cf_ref.is_null() {
            return None;
        }
        if CFGetTypeID(cf_ref) != CFStringGetTypeID() {
            return None;
        }
        let cf_str = CFString::wrap_under_get_rule(cf_ref as CFStringRef);
        Some(cf_str.to_string())
    }

    /// Convert a CFTypeRef to a String AND release the ref (for Copy/Create rule refs).
    /// Returns None if the ref is null or not a CFString.
    pub unsafe fn cftype_to_string_and_release(cf_ref: CFTypeRef) -> Option<String> {
        if cf_ref.is_null() {
            return None;
        }
        let result = cftype_to_string(cf_ref);
        CFRelease(cf_ref);
        result
    }

    /// Release a CFTypeRef if it is not null. Safe no-op for null pointers.
    pub unsafe fn release_if_not_null(cf_ref: CFTypeRef) {
        if !cf_ref.is_null() {
            CFRelease(cf_ref);
        }
    }

    extern "C" {
        pub fn AXUIElementCreateSystemWide() -> AXUIElementRef;
        pub fn AXUIElementCreateApplication(pid: i32) -> AXUIElementRef;
        pub fn AXUIElementCopyAttributeValue(
            element: AXUIElementRef,
            attribute: CFStringRef,
            value: *mut CFTypeRef,
        ) -> AXError;
        pub fn AXUIElementCopyAttributeNames(
            element: AXUIElementRef,
            names: *mut CFTypeRef,
        ) -> AXError;
        pub fn AXIsProcessTrusted() -> bool;
        pub fn AXIsProcessTrustedWithOptions(options: CFTypeRef) -> bool;
    }

    // CGWindowList types
    pub type CGWindowID = u32;

    extern "C" {
        pub fn CGWindowListCopyWindowInfo(
            option: u32,
            relative_to_window: CGWindowID,
        ) -> CFTypeRef;
    }

    // Window list options
    pub const K_CG_WINDOW_LIST_OPTION_ON_SCREEN_ONLY: u32 = 1 << 0;
    pub const K_CG_WINDOW_LIST_EXCLUDE_DESKTOP_ELEMENTS: u32 = 1 << 4;

    // NSWorkspace via objc runtime
    extern "C" {
        pub fn NSPasteboardGeneralPasteboard() -> *mut c_void;
    }

    /// Check if accessibility permission is granted
    pub fn check_accessibility_permission() -> bool {
        unsafe { AXIsProcessTrusted() }
    }

    /// Prompt user for accessibility permission if not granted
    pub fn request_accessibility_permission() -> bool {
        unsafe {
            let key = CFString::new("AXTrustedCheckOptionPrompt");
            let value = CFBoolean::true_value();
            let options = CFDictionary::from_CFType_pairs(&[(key.as_CFType(), value.as_CFType())]);
            AXIsProcessTrustedWithOptions(options.as_CFTypeRef())
        }
    }

    /// Get the frontmost application info via AXUIElement
    pub fn get_focused_app() -> Option<(String, String, i32)> {
        unsafe {
            let system = AXUIElementCreateSystemWide();
            let attr = CFString::new("AXFocusedApplication");
            let mut app_ref: CFTypeRef = ptr::null();

            let err = AXUIElementCopyAttributeValue(
                system,
                attr.as_concrete_TypeRef(),
                &mut app_ref,
            );

            CFRelease(system);

            if err != K_AX_ERROR_SUCCESS || app_ref.is_null() {
                return None;
            }

            // Get app title
            let title_attr = CFString::new("AXTitle");
            let mut title_ref: CFTypeRef = ptr::null();
            AXUIElementCopyAttributeValue(app_ref, title_attr.as_concrete_TypeRef(), &mut title_ref);

            let app_name = cftype_to_string_and_release(title_ref).unwrap_or_else(|| "Unknown".to_string());

            // Get PID via AXPid attribute
            let pid_attr = CFString::new("AXPid");
            let mut pid_ref: CFTypeRef = ptr::null();
            let pid_err = AXUIElementCopyAttributeValue(
                app_ref,
                pid_attr.as_concrete_TypeRef(),
                &mut pid_ref,
            );

            // Default PID
            let pid: i32 = if pid_err == K_AX_ERROR_SUCCESS && !pid_ref.is_null() {
                // pid_ref is a CFNumber — we own it from CopyAttributeValue
                let cf_num = CFNumber::wrap_under_create_rule(pid_ref as _);
                cf_num.to_i32().unwrap_or(0)
                // cf_num Drop releases pid_ref
            } else {
                release_if_not_null(pid_ref);
                0
            };

            CFRelease(app_ref);

            Some((app_name, String::new(), pid))
        }
    }

    /// Get the focused window title
    pub fn get_focused_window_title(app_ref: AXUIElementRef) -> String {
        unsafe {
            let attr = CFString::new("AXFocusedWindow");
            let mut window_ref: CFTypeRef = ptr::null();

            let err = AXUIElementCopyAttributeValue(
                app_ref,
                attr.as_concrete_TypeRef(),
                &mut window_ref,
            );

            if err != K_AX_ERROR_SUCCESS || window_ref.is_null() {
                return String::new();
            }

            let title_attr = CFString::new("AXTitle");
            let mut title_ref: CFTypeRef = ptr::null();
            AXUIElementCopyAttributeValue(
                window_ref,
                title_attr.as_concrete_TypeRef(),
                &mut title_ref,
            );

            let title = cftype_to_string_and_release(title_ref).unwrap_or_default();

            CFRelease(window_ref);
            title
        }
    }

    /// Get the focused UI element's text value
    pub fn get_focused_element_text(app_ref: AXUIElementRef) -> (String, String) {
        unsafe {
            let attr = CFString::new("AXFocusedUIElement");
            let mut element_ref: CFTypeRef = ptr::null();

            let err = AXUIElementCopyAttributeValue(
                app_ref,
                attr.as_concrete_TypeRef(),
                &mut element_ref,
            );

            if err != K_AX_ERROR_SUCCESS || element_ref.is_null() {
                return (String::new(), String::new());
            }

            // Get the value (text content)
            let value_attr = CFString::new("AXValue");
            let mut value_ref: CFTypeRef = ptr::null();
            AXUIElementCopyAttributeValue(
                element_ref,
                value_attr.as_concrete_TypeRef(),
                &mut value_ref,
            );

            let focused_text = cftype_to_string_and_release(value_ref).unwrap_or_default();

            // Get selected text
            let sel_attr = CFString::new("AXSelectedText");
            let mut sel_ref: CFTypeRef = ptr::null();
            AXUIElementCopyAttributeValue(
                element_ref,
                sel_attr.as_concrete_TypeRef(),
                &mut sel_ref,
            );

            let selected_text = cftype_to_string_and_release(sel_ref).unwrap_or_default();

            CFRelease(element_ref);
            (focused_text, selected_text)
        }
    }

    /// Walk a window's AX tree and collect all visible text elements
    pub fn collect_visible_text(app_ref: AXUIElementRef, max_depth: u32) -> Vec<String> {
        let mut texts = Vec::new();

        unsafe {
            let attr = CFString::new("AXFocusedWindow");
            let mut window_ref: CFTypeRef = ptr::null();

            let err = AXUIElementCopyAttributeValue(
                app_ref,
                attr.as_concrete_TypeRef(),
                &mut window_ref,
            );

            if err != K_AX_ERROR_SUCCESS || window_ref.is_null() {
                return texts;
            }

            collect_text_recursive(window_ref, &mut texts, 0, max_depth);
            CFRelease(window_ref);
        }

        texts
    }

    unsafe fn collect_text_recursive(
        element: AXUIElementRef,
        texts: &mut Vec<String>,
        depth: u32,
        max_depth: u32,
    ) {
        if depth > max_depth || texts.len() > 500 {
            return;
        }

        // Try to get role
        let role_attr = CFString::new("AXRole");
        let mut role_ref: CFTypeRef = ptr::null();
        AXUIElementCopyAttributeValue(element, role_attr.as_concrete_TypeRef(), &mut role_ref);

        let role = cftype_to_string_and_release(role_ref).unwrap_or_default();

        // Extract text from text-bearing roles
        let text_roles = [
            "AXStaticText",
            "AXTextField",
            "AXTextArea",
            "AXLink",
            "AXHeading",
            "AXCell",
            "AXMenuItem",
            "AXButton",
        ];

        if text_roles.iter().any(|r| role == *r) {
            // Try AXValue first, then AXTitle
            let value_attr = CFString::new("AXValue");
            let mut value_ref: CFTypeRef = ptr::null();
            AXUIElementCopyAttributeValue(element, value_attr.as_concrete_TypeRef(), &mut value_ref);

            let text = if let Some(val) = cftype_to_string(value_ref) {
                release_if_not_null(value_ref);
                val
            } else {
                release_if_not_null(value_ref);
                let title_attr = CFString::new("AXTitle");
                let mut title_ref: CFTypeRef = ptr::null();
                AXUIElementCopyAttributeValue(
                    element,
                    title_attr.as_concrete_TypeRef(),
                    &mut title_ref,
                );
                cftype_to_string_and_release(title_ref).unwrap_or_default()
            };

            let trimmed = text.trim().to_string();
            if !trimmed.is_empty() && trimmed.len() > 1 {
                texts.push(trimmed);
            }
        }

        // Recurse into children
        let children_attr = CFString::new("AXChildren");
        let mut children_ref: CFTypeRef = ptr::null();
        let err = AXUIElementCopyAttributeValue(
            element,
            children_attr.as_concrete_TypeRef(),
            &mut children_ref,
        );

        if err == K_AX_ERROR_SUCCESS && !children_ref.is_null() {
            // Use create_rule since CopyAttributeValue follows the Create Rule
            let children: CFArray = CFArray::wrap_under_create_rule(children_ref as _);
            let child_ptrs = children.get_all_values();
            for child_ptr in child_ptrs {
                if !child_ptr.is_null() {
                    // Children within the array are NOT owned by us — the array owns them.
                    // Do NOT release individual children.
                    collect_text_recursive(
                        child_ptr as CFTypeRef,
                        texts,
                        depth + 1,
                        max_depth,
                    );
                }
            }
            // children (CFArray) goes out of scope here and releases via Drop
        }
    }

    /// Get URL from browser address bar (works for Safari, Chrome, Arc, etc.)
    pub fn get_browser_url(_app_name: &str, app_ref: AXUIElementRef) -> Option<String> {
        unsafe {
            // For browsers, the URL bar is usually an AXTextField with specific attributes
            let attr = CFString::new("AXFocusedWindow");
            let mut window_ref: CFTypeRef = ptr::null();

            let err = AXUIElementCopyAttributeValue(
                app_ref,
                attr.as_concrete_TypeRef(),
                &mut window_ref,
            );

            if err != K_AX_ERROR_SUCCESS || window_ref.is_null() {
                return None;
            }

            // Try AXDocument attribute (Safari exposes URL here)
            let doc_attr = CFString::new("AXDocument");
            let mut doc_ref: CFTypeRef = ptr::null();
            AXUIElementCopyAttributeValue(
                window_ref,
                doc_attr.as_concrete_TypeRef(),
                &mut doc_ref,
            );

            let url = cftype_to_string_and_release(doc_ref);

            CFRelease(window_ref);
            url
        }
    }

    /// Read clipboard text
    pub fn get_clipboard_text() -> String {
        // Use objc runtime to access NSPasteboard
        use std::process::Command;
        // Simple approach: use pbpaste command
        match Command::new("pbpaste").output() {
            Ok(output) => {
                String::from_utf8_lossy(&output.stdout)
                    .chars()
                    .take(2000) // limit clipboard text
                    .collect()
            }
            Err(_) => String::new(),
        }
    }

    /// Get window list metadata via CGWindowListCopyWindowInfo
    pub fn get_window_list() -> Vec<(String, String)> {
        unsafe {
            let option =
                K_CG_WINDOW_LIST_OPTION_ON_SCREEN_ONLY | K_CG_WINDOW_LIST_EXCLUDE_DESKTOP_ELEMENTS;
            let list = CGWindowListCopyWindowInfo(option, 0);

            if list.is_null() {
                return Vec::new();
            }

            let array: CFArray = CFArray::wrap_under_create_rule(list as _);
            let mut windows = Vec::new();
            let all_values = array.get_all_values();

            for dict_ptr in all_values {
                if !dict_ptr.is_null() {
                    let dict: CFDictionary<CFString, CFString> = CFDictionary::wrap_under_get_rule(dict_ptr as _);

                    let owner_key = CFString::new("kCGWindowOwnerName");
                    let name_key = CFString::new("kCGWindowName");

                    let owner = dict
                        .find(owner_key)
                        .map(|v| v.to_string())
                        .unwrap_or_default();

                    let name = dict
                        .find(name_key)
                        .map(|v| v.to_string())
                        .unwrap_or_default();

                    if !owner.is_empty() && !name.is_empty() {
                        windows.push((owner, name));
                    }
                }
            }

            windows
        }
    }
}

// ─── Activity Type Classification ─────────────────────────────────────────────

fn classify_activity(app_name: &str, window_title: &str, focused_text: &str) -> String {
    let app_lower = app_name.to_lowercase();
    let title_lower = window_title.to_lowercase();

    // Communication apps
    if ["whatsapp", "messages", "telegram", "slack", "discord", "teams", "zoom", "facetime"]
        .iter()
        .any(|a| app_lower.contains(a))
    {
        return "communicating".to_string();
    }

    // Email
    if ["mail", "outlook", "gmail", "spark", "airmail"]
        .iter()
        .any(|a| app_lower.contains(a) || title_lower.contains(a))
    {
        return "communicating".to_string();
    }

    // Coding
    if ["code", "xcode", "intellij", "webstorm", "cursor", "terminal", "iterm", "warp", "vim", "neovim", "claude"]
        .iter()
        .any(|a| app_lower.contains(a))
    {
        return "coding".to_string();
    }

    // Design
    if ["figma", "sketch", "photoshop", "illustrator", "canva", "kino", "affinity"]
        .iter()
        .any(|a| app_lower.contains(a))
    {
        return "designing".to_string();
    }

    // Documents / Writing
    if ["pages", "word", "docs", "notion", "obsidian", "bear", "notes", "textedit", "numbers", "excel", "sheets"]
        .iter()
        .any(|a| app_lower.contains(a))
    {
        return "writing".to_string();
    }

    // Calendar / Planning
    if ["calendar", "fantastical", "cron"]
        .iter()
        .any(|a| app_lower.contains(a))
    {
        return "planning".to_string();
    }

    // Browsers — classify by content
    if ["safari", "chrome", "firefox", "arc", "brave", "edge", "opera"]
        .iter()
        .any(|a| app_lower.contains(a))
    {
        // Check window title for clues
        if title_lower.contains("gmail")
            || title_lower.contains("outlook")
            || title_lower.contains("slack")
            || title_lower.contains("whatsapp")
        {
            return "communicating".to_string();
        }
        if title_lower.contains("github")
            || title_lower.contains("gitlab")
            || title_lower.contains("stackoverflow")
        {
            return "coding".to_string();
        }
        if title_lower.contains("docs")
            || title_lower.contains("notion")
            || title_lower.contains("confluence")
        {
            return "writing".to_string();
        }
        if title_lower.contains("figma") {
            return "designing".to_string();
        }
        return "browsing".to_string();
    }

    // If there's text being entered, it's writing
    if !focused_text.is_empty() {
        return "writing".to_string();
    }

    "reading".to_string()
}

// ─── Context Diffing ──────────────────────────────────────────────────────────

fn context_has_changed(prev: &Option<DesktopContext>, curr: &DesktopContext) -> bool {
    match prev {
        None => true,
        Some(prev) => {
            // App or window changed — always emit
            if prev.active_app != curr.active_app || prev.window_title != curr.window_title {
                return true;
            }
            // Significant text content change
            if prev.focused_text != curr.focused_text && !curr.focused_text.is_empty() {
                return true;
            }
            // Selected text changed
            if prev.selected_text != curr.selected_text && !curr.selected_text.is_empty() {
                return true;
            }
            // Clipboard changed
            if prev.clipboard_text != curr.clipboard_text && !curr.clipboard_text.is_empty() {
                return true;
            }
            // Visible text substantially different (check length diff as quick heuristic)
            let prev_len: usize = prev.visible_text.iter().map(|s| s.len()).sum();
            let curr_len: usize = curr.visible_text.iter().map(|s| s.len()).sum();
            let diff = (prev_len as i64 - curr_len as i64).unsigned_abs() as usize;
            if diff > 200 {
                return true;
            }
            false
        }
    }
}

fn now_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

// ─── Tauri Commands ───────────────────────────────────────────────────────────

#[cfg(target_os = "macos")]
#[tauri::command]
pub fn check_accessibility() -> bool {
    macos::check_accessibility_permission()
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
pub fn check_accessibility() -> bool {
    false
}

#[cfg(target_os = "macos")]
#[tauri::command]
pub fn request_accessibility() -> bool {
    macos::request_accessibility_permission()
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
pub fn request_accessibility() -> bool {
    false
}

#[tauri::command]
pub fn get_observer_status(state: tauri::State<'_, Arc<Mutex<ObserverState>>>) -> ObserverStatus {
    let state = state.lock().unwrap();
    ObserverStatus {
        running: state.running,
        has_accessibility_permission: {
            #[cfg(target_os = "macos")]
            {
                macos::check_accessibility_permission()
            }
            #[cfg(not(target_os = "macos"))]
            {
                false
            }
        },
        apps_observed: state.apps_observed,
        context_changes_emitted: state.context_changes_emitted,
        last_context: state.last_context.clone(),
    }
}

#[tauri::command]
pub fn get_current_context(
    state: tauri::State<'_, Arc<Mutex<ObserverState>>>,
) -> Option<DesktopContext> {
    let state = state.lock().unwrap();
    state.last_context.clone()
}

#[cfg(target_os = "macos")]
#[tauri::command]
pub fn capture_context_now() -> Option<DesktopContext> {
    capture_desktop_context()
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
pub fn capture_context_now() -> Option<DesktopContext> {
    None
}

// ─── Core Capture Logic ───────────────────────────────────────────────────────

#[cfg(target_os = "macos")]
fn capture_desktop_context() -> Option<DesktopContext> {
    use core_foundation::base::{CFRelease, CFTypeRef, TCFType};
    use core_foundation::string::CFString;
    use std::ptr;

    if !macos::check_accessibility_permission() {
        return None;
    }

    unsafe {
        // 1. Get focused app
        let system = macos::AXUIElementCreateSystemWide();
        let attr = CFString::new("AXFocusedApplication");
        let mut app_ref: CFTypeRef = ptr::null();

        let err = macos::AXUIElementCopyAttributeValue(
            system,
            attr.as_concrete_TypeRef(),
            &mut app_ref,
        );

        CFRelease(system);

        if err != macos::K_AX_ERROR_SUCCESS || app_ref.is_null() {
            return None;
        }

        // Get app title
        let title_attr = CFString::new("AXTitle");
        let mut title_ref: CFTypeRef = ptr::null();
        macos::AXUIElementCopyAttributeValue(
            app_ref,
            title_attr.as_concrete_TypeRef(),
            &mut title_ref,
        );

        let app_name = macos::cftype_to_string_and_release(title_ref).unwrap_or_else(|| "Unknown".to_string());

        // 2. Get window title
        let window_title = macos::get_focused_window_title(app_ref);

        // 3. Get focused element text and selected text
        let (focused_text, selected_text) = macos::get_focused_element_text(app_ref);

        // 4. Collect visible text (limit tree depth to avoid performance issues)
        let visible_text = macos::collect_visible_text(app_ref, 8);

        // 5. Get browser URL if applicable
        let url = macos::get_browser_url(&app_name, app_ref);

        // 6. Get clipboard
        let clipboard_text = macos::get_clipboard_text();

        // 7. Classify activity
        let activity_type = classify_activity(&app_name, &window_title, &focused_text);

        CFRelease(app_ref);

        Some(DesktopContext {
            timestamp: now_millis(),
            active_app: app_name,
            bundle_id: String::new(), // populated from window list if needed
            window_title,
            focused_text: focused_text.chars().take(5000).collect(),
            selected_text: selected_text.chars().take(2000).collect(),
            visible_text: visible_text
                .into_iter()
                .take(200) // limit number of text elements
                .collect(),
            clipboard_text,
            activity_type,
            url,
        })
    }
}

// ─── Background Observer Loop ─────────────────────────────────────────────────

#[cfg(target_os = "macos")]
pub fn start_observer_loop(app: AppHandle, state: Arc<Mutex<ObserverState>>) {
    // Mark as running
    {
        let mut s = state.lock().unwrap();
        if s.running {
            return; // Already running
        }
        s.running = true;
    }

    std::thread::spawn(move || {
        log::info!("[desktop-observer] Starting observation loop");

        // Minimum interval between context emissions (1 second)
        let min_emit_interval = Duration::from_secs(1);
        // Poll interval (500ms — fast enough to catch app switches)
        let poll_interval = Duration::from_millis(500);
        let mut last_emit = Instant::now() - min_emit_interval;

        loop {
            // Check if we should stop
            {
                let s = state.lock().unwrap();
                if !s.running {
                    break;
                }
            }

            // Capture current context — catch panics from unexpected AX element types
            let capture_result = std::panic::catch_unwind(|| capture_desktop_context());
            let context_opt = match capture_result {
                Ok(ctx) => ctx,
                Err(_) => {
                    log::warn!("[desktop-observer] Capture panicked — skipping this cycle");
                    std::thread::sleep(poll_interval);
                    continue;
                }
            };
            if let Some(context) = context_opt {
                let should_emit = {
                    let s = state.lock().unwrap();
                    context_has_changed(&s.last_context, &context)
                        && last_emit.elapsed() >= min_emit_interval
                };

                if should_emit {
                    // Emit event to frontend
                    let _ = app.emit("desktop-context-changed", &context);
                    last_emit = Instant::now();

                    // Update state
                    let mut s = state.lock().unwrap();
                    s.apps_observed += 1;
                    s.context_changes_emitted += 1;
                    s.last_context = Some(context);
                } else {
                    // Still update the last context even if we didn't emit
                    let mut s = state.lock().unwrap();
                    if context_has_changed(&s.last_context, &context) {
                        s.last_context = Some(context);
                    }
                }
            }

            std::thread::sleep(poll_interval);
        }

        log::info!("[desktop-observer] Observation loop stopped");
    });
}

#[tauri::command]
pub fn start_observing(
    app: AppHandle,
    state: tauri::State<'_, Arc<Mutex<ObserverState>>>,
) -> bool {
    #[cfg(target_os = "macos")]
    {
        if !macos::check_accessibility_permission() {
            macos::request_accessibility_permission();
            return false;
        }
        start_observer_loop(app, state.inner().clone());
        true
    }

    #[cfg(not(target_os = "macos"))]
    {
        false
    }
}

#[tauri::command]
pub fn stop_observing(state: tauri::State<'_, Arc<Mutex<ObserverState>>>) {
    let mut s = state.lock().unwrap();
    s.running = false;
}

// ─── Plugin Init ──────────────────────────────────────────────────────────────

pub fn init_observer_state() -> Arc<Mutex<ObserverState>> {
    Arc::new(Mutex::new(ObserverState {
        running: false,
        last_context: None,
        apps_observed: 0,
        context_changes_emitted: 0,
    }))
}
