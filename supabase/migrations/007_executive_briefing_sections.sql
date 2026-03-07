-- Add new executive-focused briefing item sections
ALTER TYPE briefing_item_section ADD VALUE IF NOT EXISTS 'vip_inbox';
ALTER TYPE briefing_item_section ADD VALUE IF NOT EXISTS 'action_required';
ALTER TYPE briefing_item_section ADD VALUE IF NOT EXISTS 'awaiting_reply';
ALTER TYPE briefing_item_section ADD VALUE IF NOT EXISTS 'after_hours';
