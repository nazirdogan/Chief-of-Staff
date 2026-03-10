/// Apple Vision OCR — captures the main display and runs fast text recognition.
///
/// Only compiled on Apple Silicon (aarch64) macOS.
/// Intel Macs fall through to the stub module which returns vec![].
///
/// Permission: requires Screen Recording (CGPreflightScreenCaptureAccess).
/// macOS will prompt automatically on first capture attempt if not yet granted.

// ─── Apple Silicon implementation ────────────────────────────────────────────

#[cfg(all(target_os = "macos", target_arch = "aarch64"))]
mod inner {
    use std::ffi::{c_void, CStr};
    use std::ptr;

    // Link Vision framework (not linked by default)
    #[link(name = "Vision", kind = "framework")]
    extern "C" {}

    // CoreGraphics display capture + permission APIs
    extern "C" {
        fn CGMainDisplayID() -> u32;
        fn CGDisplayCreateImage(display_id: u32) -> *const c_void;
        fn CGImageRelease(image: *const c_void);
        fn CGPreflightScreenCaptureAccess() -> bool;
        fn CGRequestScreenCaptureAccess() -> bool;
    }

    pub fn has_screen_recording_permission() -> bool {
        unsafe { CGPreflightScreenCaptureAccess() }
    }

    pub fn request_screen_recording_permission() -> bool {
        unsafe { CGRequestScreenCaptureAccess() }
    }

    pub fn capture_ocr_text() -> Vec<String> {
        unsafe {
            // Don't attempt capture if permission not granted
            if !CGPreflightScreenCaptureAccess() {
                return vec![];
            }

            let display_id = CGMainDisplayID();
            let cg_image = CGDisplayCreateImage(display_id);
            if cg_image.is_null() {
                return vec![];
            }

            let result = run_vision_ocr(cg_image);
            CGImageRelease(cg_image);
            result
        }
    }

    /// Run VNRecognizeTextRequest against a CGImageRef.
    /// Uses raw Objective-C message sends via objc2 to avoid heavy vision bindings.
    unsafe fn run_vision_ocr(cg_image: *const c_void) -> Vec<String> {
        use objc2::rc::autoreleasepool;
        use objc2::runtime::{AnyClass, AnyObject};
        use objc2::msg_send;

        autoreleasepool(|_pool| {
            // ── Load Vision classes ──────────────────────────────────────────
            let handler_cls = match AnyClass::get("VNImageRequestHandler") {
                Some(c) => c,
                None => {
                    log::warn!("[ocr] VNImageRequestHandler class not found — Vision unavailable");
                    return vec![];
                }
            };
            let request_cls = match AnyClass::get("VNRecognizeTextRequest") {
                Some(c) => c,
                None => return vec![],
            };

            // ── Build VNImageRequestHandler with the CGImageRef ──────────────
            let dict_cls = match AnyClass::get("NSDictionary") {
                Some(c) => c,
                None => return vec![],
            };
            let options: *mut AnyObject = msg_send![dict_cls, dictionary];

            let handler: *mut AnyObject = {
                let alloc: *mut AnyObject = msg_send![handler_cls, alloc];
                // initWithCGImage:options:
                msg_send![alloc, initWithCGImage: (cg_image as *const AnyObject), options: options]
            };
            if handler.is_null() {
                return vec![];
            }

            // ── Build VNRecognizeTextRequest ─────────────────────────────────
            let request: *mut AnyObject = {
                let alloc: *mut AnyObject = msg_send![request_cls, alloc];
                // initWithCompletionHandler: nil (results accessed synchronously after perform)
                let null_block: *const c_void = ptr::null();
                msg_send![alloc, initWithCompletionHandler: null_block]
            };
            if request.is_null() {
                let _: () = msg_send![handler, release];
                return vec![];
            }

            // recognitionLevel = VNRequestTextRecognitionLevelFast (1)
            let _: () = msg_send![request, setRecognitionLevel: 1usize];

            // ── Perform request ──────────────────────────────────────────────
            let array_cls = match AnyClass::get("NSArray") {
                Some(c) => c,
                None => {
                    let _: () = msg_send![handler, release];
                    let _: () = msg_send![request, release];
                    return vec![];
                }
            };
            let requests: *mut AnyObject = msg_send![array_cls, arrayWithObject: request];

            // performRequests:error: — synchronous, error out-param unused
            let null_err: *mut *mut AnyObject = ptr::null_mut();
            let _ok: bool = msg_send![handler, performRequests: requests, error: null_err];

            // ── Extract results ──────────────────────────────────────────────
            let results: *mut AnyObject = msg_send![request, results];
            if results.is_null() {
                let _: () = msg_send![handler, release];
                let _: () = msg_send![request, release];
                return vec![];
            }

            let count: usize = msg_send![results, count];
            let mut texts: Vec<String> = Vec::with_capacity(count.min(200));

            for i in 0..count {
                let obs: *mut AnyObject = msg_send![results, objectAtIndex: i];

                // topCandidates:1 → NSArray with best VNRecognizedText
                let candidates: *mut AnyObject = msg_send![obs, topCandidates: 1usize];
                let cand_count: usize = msg_send![candidates, count];
                if cand_count == 0 {
                    continue;
                }

                let candidate: *mut AnyObject = msg_send![candidates, objectAtIndex: 0usize];
                let ns_str: *const AnyObject = msg_send![candidate, string];
                if ns_str.is_null() {
                    continue;
                }

                let utf8: *const i8 = msg_send![ns_str, UTF8String];
                if utf8.is_null() {
                    continue;
                }

                if let Ok(text) = CStr::from_ptr(utf8).to_str() {
                    let trimmed = text.trim();
                    // Skip single chars, pure numbers/punctuation, and whitespace-only
                    if trimmed.len() > 2
                        && !trimmed.chars().all(|c| c.is_ascii_digit() || c == ':' || c == '.' || c.is_whitespace())
                    {
                        texts.push(trimmed.to_string());
                    }
                }
            }

            let _: () = msg_send![handler, release];
            let _: () = msg_send![request, release];

            texts
        })
    }
}

// ─── Intel Mac stub ──────────────────────────────────────────────────────────

#[cfg(not(all(target_os = "macos", target_arch = "aarch64")))]
mod inner {
    pub fn has_screen_recording_permission() -> bool {
        false
    }
    pub fn request_screen_recording_permission() -> bool {
        false
    }
    pub fn capture_ocr_text() -> Vec<String> {
        vec![]
    }
}

// ─── Public API ───────────────────────────────────────────────────────────────

pub fn has_screen_recording_permission() -> bool {
    inner::has_screen_recording_permission()
}

pub fn request_screen_recording_permission() -> bool {
    inner::request_screen_recording_permission()
}

pub fn capture_ocr_text() -> Vec<String> {
    inner::capture_ocr_text()
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::desktop_observer::DesktopContext;

    // ── Public API surface ────────────────────────────────────────────────────

    #[test]
    fn permission_check_does_not_panic() {
        // Just verify the function is callable and returns a bool cleanly
        let _result = has_screen_recording_permission();
    }

    #[test]
    fn permission_request_does_not_panic() {
        // CGRequestScreenCaptureAccess is safe to call even without UI — returns current state
        let _result = request_screen_recording_permission();
    }

    #[test]
    fn capture_ocr_returns_vec_without_panicking() {
        // May return empty vec if no screen recording permission, but must not panic
        let result = capture_ocr_text();
        // Every returned string must be non-trivially short (filter in inner module)
        for line in &result {
            assert!(line.len() > 2, "OCR lines shorter than 3 chars should be filtered: {:?}", line);
        }
    }

    #[test]
    fn capture_ocr_returns_no_pure_numeric_lines() {
        let result = capture_ocr_text();
        for line in &result {
            let all_digits_punct = line.chars().all(|c| c.is_ascii_digit() || c == ':' || c == '.' || c.is_whitespace());
            assert!(!all_digits_punct, "Pure numeric/punctuation lines should be filtered: {:?}", line);
        }
    }

    // ── DesktopContext serde — ocr_text field ─────────────────────────────────

    #[test]
    fn desktop_context_deserializes_without_ocr_text_field() {
        // Old serialized contexts (pre-OCR) must still deserialize cleanly
        // thanks to #[serde(default)] on ocr_text
        let json = r#"{
            "timestamp": 1000,
            "active_app": "Cursor",
            "bundle_id": "com.cursor.editor",
            "window_title": "screen_ocr.rs — src — donna — Cursor",
            "focused_text": "",
            "selected_text": "",
            "visible_text": ["fn capture_ocr_text"],
            "clipboard_text": "",
            "activity_type": "coding",
            "url": null
        }"#;

        let ctx: DesktopContext = serde_json::from_str(json).expect("should deserialize");
        assert!(ctx.ocr_text.is_empty(), "missing ocr_text should default to empty vec");
    }

    #[test]
    fn desktop_context_roundtrip_with_ocr_text() {
        let ctx = DesktopContext {
            timestamp: 1_741_651_200_000,
            active_app: "WhatsApp".into(),
            bundle_id: "net.whatsapp.WhatsApp".into(),
            window_title: "Mum — WhatsApp".into(),
            focused_text: String::new(),
            selected_text: String::new(),
            visible_text: vec![],
            clipboard_text: String::new(),
            activity_type: "communicating".into(),
            url: None,
            ocr_text: vec![
                "Mum: Are you coming for dinner?".into(),
                "Me: Yes, around 7pm".into(),
                "Mum: Perfect 🎉".into(),
            ],
        };

        let json = serde_json::to_string(&ctx).expect("should serialize");
        let decoded: DesktopContext = serde_json::from_str(&json).expect("should deserialize");

        assert_eq!(decoded.ocr_text.len(), 3);
        assert_eq!(decoded.ocr_text[0], "Mum: Are you coming for dinner?");
        assert_eq!(decoded.ocr_text[2], "Mum: Perfect 🎉");
        assert_eq!(decoded.active_app, "WhatsApp");
    }

    #[test]
    fn desktop_context_with_empty_ocr_text_serializes_cleanly() {
        let ctx = DesktopContext {
            timestamp: 0,
            active_app: "Safari".into(),
            bundle_id: "com.apple.Safari".into(),
            window_title: "GitHub".into(),
            focused_text: String::new(),
            selected_text: String::new(),
            visible_text: vec![],
            clipboard_text: String::new(),
            activity_type: "browsing".into(),
            url: Some("https://github.com".into()),
            ocr_text: vec![],
        };

        let json = serde_json::to_string(&ctx).expect("should serialize");
        // Verify field is present in output
        assert!(json.contains("ocr_text"), "ocr_text should be in serialized output");

        let decoded: DesktopContext = serde_json::from_str(&json).expect("should deserialize");
        assert!(decoded.ocr_text.is_empty());
    }

    // ── Intel stub behaviour ──────────────────────────────────────────────────

    #[test]
    #[cfg(not(all(target_os = "macos", target_arch = "aarch64")))]
    fn intel_stub_always_returns_false_and_empty() {
        assert!(!has_screen_recording_permission());
        assert!(!request_screen_recording_permission());
        assert!(capture_ocr_text().is_empty());
    }
}
