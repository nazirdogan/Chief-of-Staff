// Donna Demo Video — Design Constants

export const FPS = 30;
export const DURATION_SECONDS = 60;
export const DURATION_FRAMES = FPS * DURATION_SECONDS; // 1800
export const WIDTH = 1920;
export const HEIGHT = 1080;

// Scene frame ranges
export const SCENES = {
  hook:      { start: 0,    duration: 5 * FPS },   // 0-150
  problem:   { start: 150,  duration: 5 * FPS },   // 150-300
  briefing:  { start: 300,  duration: 10 * FPS },  // 300-600
  chat:      { start: 600,  duration: 8 * FPS },   // 600-840
  autonomy:  { start: 840,  duration: 7 * FPS },   // 840-1050
  inbox:     { start: 1050, duration: 7 * FPS },    // 1050-1260
  people:    { start: 1260, duration: 6 * FPS },    // 1260-1440
  tagline:   { start: 1440, duration: 5 * FPS },    // 1440-1590
  cta:       { start: 1590, duration: 7 * FPS },    // 1590-1800
} as const;

// Brand colors — The Editor identity
export const COLORS = {
  parchment: '#FAF9F6',
  charcoal: '#2D2D2D',
  dawn: '#E8845C',
  linen: '#F1EDEA',
  slate: '#8D99AE',
  steel: '#457B9D',
  sage: '#52B788',
  gold: '#C9862A',
  red: '#D64B2A',
  white: '#FFFFFF',
  purple: '#6B21A8',
  // Opacity variants
  textSecondary: 'rgba(45,45,45,0.8)',
  textTertiary: 'rgba(45,45,45,0.6)',
  textMuted: 'rgba(45,45,45,0.5)',
  textGhost: 'rgba(45,45,45,0.4)',
  surface: 'rgba(45,45,45,0.04)',
  surfaceElevated: 'rgba(45,45,45,0.06)',
  border: 'rgba(45,45,45,0.08)',
  borderHover: 'rgba(45,45,45,0.16)',
  dawnMuted: 'rgba(232,132,92,0.12)',
  dawnSubtle: 'rgba(232,132,92,0.10)',
  dawnBorder: 'rgba(232,132,92,0.25)',
  dawnBorderActive: 'rgba(232,132,92,0.35)',
  sageMuted: 'rgba(82,183,136,0.1)',
  goldMuted: 'rgba(244,200,150,0.1)',
} as const;

// Sidebar navigation items
export const NAV_ITEMS = [
  { label: 'Ask Donna', icon: 'MessageCircle', key: 'chat' },
  { label: 'Today', icon: 'LayoutDashboard', key: 'today' },
  { label: 'Inbox', icon: 'Inbox', key: 'inbox' },
  { label: 'Commitments', icon: 'CheckCircle2', key: 'commitments' },
  { label: 'People', icon: 'Users', key: 'people' },
  { label: 'Reflections', icon: 'BookOpen', key: 'reflections' },
] as const;

// Fake data for the demo
export const FAKE_DATA = {
  userName: 'Sarah',
  date: 'Monday, March 10',
  briefingItems: [
    {
      rank: 1,
      title: 'Follow up on Meridian partnership proposal',
      summary: 'James Chen sent the revised terms yesterday at 6pm. He flagged a pricing concern on the enterprise tier. Response needed by EOD.',
      sentiment: 'urgent',
      source: 'Gmail — James Chen',
      priority: 'critical',
    },
    {
      rank: 2,
      title: 'Q1 board deck review with David',
      summary: 'You promised David the final revenue slide by Wednesday. Meeting is at 2pm today — he asked for it beforehand.',
      sentiment: 'action',
      source: 'Google Calendar + Slack',
      priority: 'critical',
    },
    {
      rank: 3,
      title: 'Respond to Lina about the Dubai launch timeline',
      summary: 'She asked twice last week. Your last reply was 9 days ago. Relationship score dropped to 62.',
      sentiment: 'cold',
      source: 'Gmail — Lina Khoury',
      priority: 'high',
    },
    {
      rank: 4,
      title: 'Review the new onboarding flow mockups',
      summary: 'Design team shared the Figma link in #product. 3 comments waiting for your input.',
      sentiment: null,
      source: 'Slack — #product',
      priority: 'normal',
    },
    {
      rank: 5,
      title: 'Prepare talking points for investor call',
      summary: 'Thursday 10am with Sequoia. You mentioned wanting to highlight the 40% MoM growth metric.',
      sentiment: 'action',
      source: 'Google Calendar + Notes',
      priority: 'high',
    },
  ],
  chatMessages: [
    {
      role: 'user' as const,
      text: 'What do I have going on today?',
    },
    {
      role: 'assistant' as const,
      text: `**Here's your day, Sarah:**\n\n**3 priorities** need attention before noon:\n\n1. **Meridian partnership** — James is waiting on your response to the revised pricing. He flagged a concern yesterday.\n\n2. **Q1 board deck** — Your 2pm review with David. You promised him the revenue slide by this morning.\n\n3. **Lina Khoury** — She's asked twice about the Dubai timeline. It's been 9 days.\n\n**2 meetings:** Board deck review (2pm), Design sync (4pm)\n\n**1 commitment due today:** Revenue slide to David`,
    },
  ],
  autonomyAction: {
    type: 'Calendar reminder',
    title: 'Send revenue slide to David',
    description: 'You promised this by today. Meeting is at 2pm.',
    tier: 2,
  },
  inboxItems: [
    {
      from: 'James Chen',
      email: 'james@meridian.io',
      subject: 'Re: Partnership Terms — Revised Pricing',
      summary: 'Flagged concern on enterprise tier pricing. Wants response by EOD.',
      time: '6:12 PM yesterday',
      priority: 'P1',
      unread: true,
      provider: 'Gmail',
    },
    {
      from: 'Lina Khoury',
      email: 'lina@expansion.ae',
      subject: 'Dubai Launch — Timeline Check',
      summary: 'Second follow-up about launch timeline. Awaiting your response.',
      time: '11:45 AM yesterday',
      priority: 'P2',
      unread: true,
      provider: 'Gmail',
    },
    {
      from: 'David Park',
      email: 'david@company.com',
      subject: 'Board Deck — Final Slides',
      summary: 'Confirmed 2pm meeting. Expecting revenue slide beforehand.',
      time: '9:30 AM yesterday',
      priority: null,
      unread: false,
      provider: 'Gmail',
    },
    {
      from: 'Sophie Martin',
      email: 'sophie@design.co',
      subject: 'Onboarding Flow v2 — Ready for Review',
      summary: 'Figma link shared. 3 comments need your input.',
      time: '4:15 PM yesterday',
      priority: null,
      unread: false,
      provider: 'Slack',
    },
    {
      from: 'Raj Patel',
      email: 'raj@company.com',
      subject: 'Weekly Metrics Dashboard Update',
      summary: 'MoM growth at 40%. Good talking point for Thursday.',
      time: '3:00 PM yesterday',
      priority: null,
      unread: false,
      provider: 'Notion',
    },
  ],
  contacts: [
    {
      name: 'James Chen',
      email: 'james@meridian.io',
      score: 87,
      lastInteraction: '1 day ago',
      interactions30d: 24,
      commitments: 2,
      vip: true,
      cold: false,
      org: 'Meridian Partners',
    },
    {
      name: 'David Park',
      email: 'david@company.com',
      score: 91,
      lastInteraction: '2 days ago',
      interactions30d: 31,
      commitments: 1,
      vip: true,
      cold: false,
      org: 'Internal — Board',
    },
    {
      name: 'Lina Khoury',
      email: 'lina@expansion.ae',
      score: 62,
      lastInteraction: '9 days ago',
      interactions30d: 8,
      commitments: 1,
      vip: true,
      cold: true,
      org: 'Expansion AE',
    },
    {
      name: 'Sophie Martin',
      email: 'sophie@design.co',
      score: 74,
      lastInteraction: '1 day ago',
      interactions30d: 18,
      commitments: 0,
      vip: false,
      cold: false,
      org: 'Design Team',
    },
    {
      name: 'Raj Patel',
      email: 'raj@company.com',
      score: 45,
      lastInteraction: '12 days ago',
      interactions30d: 5,
      commitments: 0,
      vip: false,
      cold: true,
      org: 'Internal — Data',
    },
  ],
  recentChats: [
    'Meeting prep: Meridian',
    'Weekly commitments review',
    'Draft email to investors',
    'What happened yesterday?',
  ],
};
