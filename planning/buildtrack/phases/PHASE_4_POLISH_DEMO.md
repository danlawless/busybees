# Phase 4: Polish & Demo

**Objective:** Prepare for investor/customer demos with complete content and polished UX.

**Prerequisites:** Phases 0-3 complete
**Enables:** Demo readiness, pilot customers

---

## Overview

Phase 4 is about refinement and preparation:

- Complete all demo content
- Fix bugs and performance issues
- Rehearse demo flow
- Create supporting materials
- Record backup demo video

After Phase 4, you're ready to deliver a compelling 7-9 minute demo that makes people say "Can I try this?"

---

## Deliverables

- [ ] All demo content seeded (12-15 modules, 4 SOPs)
- [ ] Bug fixes and performance optimization
- [ ] Demo script finalized and rehearsed
- [ ] Printed QR codes for live demo
- [ ] Recorded demo video (backup)
- [ ] Demo accounts ready (browser profiles)

---

## Tasks

### 4.1 Complete Demo Content

**Goal:** Realistic, professional content that impresses viewers.

#### Module Content Completion

Ensure all 12-15 modules have:

| Module | Video | Text | Checklist | Quiz | Thumbnail |
|--------|-------|------|-----------|------|-----------|
| Welcome to Apex | ✅ | ✅ | - | - | ✅ |
| Shop Safety Overview | ✅ | ✅ | ✅ | - | ✅ |
| Table Saw Safety & Operation | ✅ | ✅ | ✅ | ✅ | ✅ |
| Miter Saw Basics | ✅ | ✅ | ✅ | - | ✅ |
| Track Saw Operation | ✅ | - | ✅ | - | ✅ |
| How to Read Shop Drawings | - | ✅ | - | ✅ | ✅ |
| Dust Collection Best Practices | ✅ | ✅ | ✅ | - | ✅ |
| Cabinet Installation QC | - | ✅ | ✅ | - | ✅ |
| Lifting & Back Safety | ✅ | ✅ | - | ✅ | ✅ |
| Finishing Room Protocols | ✅ | ✅ | ✅ | - | ✅ |
| End of Day Cleanup | - | - | ✅ | - | ✅ |
| Punch List Standards | - | ✅ | ✅ | - | ✅ |

#### Video Content Options

For demo videos, you can:

1. **Stock footage** from Pexels/Pixabay (free, professional)
2. **Screen recordings** with voiceover
3. **Simple recordings** on phone (authentic feel)
4. **Placeholder slides** with text overlay

**Recommended approach:** Mix of stock footage for professional modules + one "authentic" field video for the upload demo flow.

#### Sample Video Sources (Free)

- [Pexels - Construction](https://www.pexels.com/search/videos/construction/)
- [Pexels - Woodworking](https://www.pexels.com/search/videos/woodworking/)
- [Pixabay - Workshop](https://pixabay.com/videos/search/workshop/)

#### SOP Content

Create 4 complete SOPs:

**1. Table Saw Daily Maintenance**
```markdown
# Table Saw Daily Maintenance

## Before First Use Each Day

1. **Visual Inspection**
   - Check blade for chips or cracks
   - Verify blade guard moves freely
   - Inspect push sticks for damage

2. **Alignment Check**
   - Blade parallel to miter slot (use square)
   - Fence parallel to blade
   - Miter gauge slides smoothly

3. **Dust Collection**
   - Empty dust bag if >50% full
   - Check hose connections
   - Verify suction at blade area

## After Last Use Each Day

1. Lower blade below table surface
2. Clean sawdust from table with brush
3. Apply paste wax to table surface monthly
4. Lock fence and blade height adjustments
```

**2. End-of-Day Shop Cleanup**
```markdown
# End-of-Day Shop Cleanup Checklist

## Every Day (15 minutes)

- [ ] Return all hand tools to designated locations
- [ ] Power off all machines at the switch
- [ ] Sweep main floor areas
- [ ] Empty small dust collectors
- [ ] Secure any loose materials
- [ ] Turn off dust collection system
- [ ] Check that no batteries are charging unattended
- [ ] Lock chemical cabinet
- [ ] Turn off lights and HVAC (last person)

## Weekly (Friday)

- [ ] Mop hard floor areas
- [ ] Clean machine tables with appropriate cleaner
- [ ] Check fire extinguisher accessibility
- [ ] Review and organize scrap bin
- [ ] Empty main dust collection
```

**3. Cabinet Install – Level & Scribe**
```markdown
# Cabinet Installation: Level & Scribe Procedure

## Tools Required

- 4' level
- Laser level (optional)
- Scribe compass
- Jigsaw with fine blade
- Shims (composite, not wood)
- Pencil

## Procedure

### Step 1: Find the High Point

1. Set laser level at cabinet height (typically 34.5" for base)
2. Check all walls where cabinets will mount
3. Mark the highest point - this is your reference

### Step 2: Install First Cabinet

1. Start at high point with corner cabinet
2. Level front-to-back using shims
3. Level side-to-side
4. Secure to wall through back rail into studs

### Step 3: Scribe Technique

When cabinet meets an uneven wall:

1. Position cabinet plumb and level
2. Set compass to largest gap between cabinet and wall
3. Run compass along wall, marking cabinet side
4. Cut along scribe line with jigsaw (blade angled toward back)
5. Test fit and adjust as needed
```

**4. Time Card Instructions**
```markdown
# How to Fill Out Your Time Card

## Daily Entry

Each day, record:

1. **Date** - Use MM/DD format
2. **Start Time** - When you clocked in
3. **End Time** - When you clocked out
4. **Break Time** - Total break minutes (lunch + other)
5. **Job Code** - From the project board

## Job Codes

| Code | Description |
|------|-------------|
| SHOP | In-shop production work |
| INST | Field installation |
| DLVR | Delivery and transport |
| MEET | Meetings and training |
| PTO | Paid time off |

## Submission

- Submit by end of day Friday
- Supervisor approval required by Monday noon
- Questions? See Sarah in the office
```

#### Acceptance Criteria

- [ ] All modules have required content blocks
- [ ] Videos load and play correctly
- [ ] Text content is professional and accurate
- [ ] Checklists have realistic items
- [ ] Quizzes have sensible questions/answers
- [ ] SOPs are complete and formatted

---

### 4.2 Bug Fixes & Performance

**Goal:** Smooth, fast experience with no visible errors.

#### Critical Bug Sweep

Test and fix:

- [ ] **Auth flows** - Login, magic link, logout all work
- [ ] **Mobile navigation** - No stuck states or broken back buttons
- [ ] **Video playback** - Loads, plays, tracks progress
- [ ] **Form submissions** - Validation, error messages, success states
- [ ] **Data loading** - Loading states, error states, empty states
- [ ] **Role permissions** - Each role sees correct content/actions

#### Performance Targets

| Metric | Target | How to Measure |
|--------|--------|----------------|
| First Contentful Paint | < 1.5s | Lighthouse |
| Time to Interactive | < 3s | Lighthouse |
| Video start time | < 2s | Manual testing |
| Page transitions | < 200ms | Perceived |
| API response time | < 300ms | Network tab |

#### Quick Wins

```typescript
// 1. Image optimization
// Add next/image or sharp for thumbnails
import Image from 'next/image';

// 2. Lazy loading for off-screen content
const ModuleCard = lazy(() => import('./ModuleCard'));

// 3. API response caching
// TanStack Query default staleTime
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// 4. Skeleton loading states
function ModuleCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="bg-gray-200 h-32 rounded-t" />
      <div className="p-4 space-y-2">
        <div className="bg-gray-200 h-4 w-3/4 rounded" />
        <div className="bg-gray-200 h-3 w-1/2 rounded" />
      </div>
    </div>
  );
}
```

#### Error Handling

Ensure graceful handling for:

- [ ] Network failures (show retry option)
- [ ] 404 pages (helpful message + navigation)
- [ ] Auth errors (redirect to login)
- [ ] Validation errors (inline messages)
- [ ] Server errors (apologetic message)

#### Acceptance Criteria

- [ ] No console errors during demo flow
- [ ] No UI flickering or layout shifts
- [ ] Loading states appear for async operations
- [ ] Error states are user-friendly
- [ ] Performance targets met

---

### 4.3 Demo Script & Rehearsal

**Goal:** Polished, confident 7-9 minute presentation.

#### Final Demo Script

```
SCENE 1: INTRO (0:00 - 0:45)

[Web browser open to landing page]

"Most construction training apps are built like school—long videos,
boring quizzes, click-through courses nobody remembers.

We built something different. BuildTrack feels like it belongs on a
job site. Let me show you."

---

SCENE 2: OWNER SETUP (0:45 - 1:30)

[Click "Start Free Trial"]

"Imagine you're Mike, owner of Apex Custom Cabinets. You want to
get your team trained up, but you don't have time to build a
curriculum from scratch."

[Complete wizard quickly]
- Upload logo (have file ready)
- Pick colors (use color picker)
- Add 2 values (pre-typed)
- Add 2 roles (pre-typed)
- Click Finish

"90 seconds. Your company's training portal is ready."

---

SCENE 3: EMPLOYEE MOBILE (1:30 - 2:30)

[Pick up phone with Expo Go ready, logged in as John]

"Now let's see what John, a new shop hire, experiences."

[Show home screen]

"John sees his personalized onboarding—8 modules, due date, his
progress. No hunting through menus."

[Pull out printed QR code, hold up to camera]

"And here's something cool. We printed QR codes for the shop.
John walks up to the table saw, scans the code..."

[Module opens instantly]

"...and the safety training for THAT machine opens immediately.
Watch, checklist, done. Right where he needs it."

---

SCENE 4: FIELD VIDEO UPLOAD (2:30 - 3:30)

[Switch to Emily's account on phone]

"But the magic is what happens next. Emily's been installing
cabinets for 10 years. She just figured out a trick for scribing
cabinets to uneven walls."

[Open upload screen, select pre-recorded video]

"She pulls out her phone, records a quick tip, picks a category,
and submits. 30 seconds."

[Submit]

"That knowledge used to walk out the door when employees left.
Now it's captured."

---

SCENE 5: ADMIN REVIEW (3:30 - 5:00)

[Switch to web, logged in as Mike/Owner]

"Back at the office, Mike gets a notification. Let's see what
Emily sent."

[Open pending uploads, click review]

"He watches the video... this is gold. Instead of just approving
it, watch this."

[Click "Create Module"]

"One click. The video becomes a training module. He can add a
checklist, a quiz, assign it to the installation track..."

[Add one checklist item, click Publish]

"Done. What took Emily 30 seconds to record now trains every
future installer."

---

SCENE 6: LIVE UPDATE (5:00 - 5:45)

[Pick up phone, show Carlos's account refreshing library]

"Carlos is in the field. He refreshes his library..."

[Show new module appearing with "New" badge]

"Emily's tip is right there. Created today, ready to learn."

---

SCENE 7: SUPERVISOR DASHBOARD (5:45 - 6:30)

[Switch to Dave (Supervisor) on web]

"Dave supervises the install crew. His dashboard shows him:"

- "3 pending video reviews"
- "Carlos is 4 days behind on onboarding"
- "John's OSHA cert expires next week"

"No spreadsheets. No chasing people down. Everything in one place."

---

SCENE 8: CERTIFICATIONS (6:30 - 7:00)

[Click into John's profile, show certification wallet]

"And every employee has a digital wallet of their certifications.
When John completes his table saw training, he's certified. The
system tracks expiry automatically."

[Show expiry warning]

"John knows. Dave knows. Nobody's surprised."

---

SCENE 9: CLOSE (7:00 - 7:30)

[Return to dashboard]

"This is BuildTrack. Training that captures tribal knowledge,
meets workers where they are, and actually gets used.

This is live today. We have [X] companies piloting it.

Who wants to be next?"

[End]
```

#### Demo Prep Checklist

Before each demo:

- [ ] Browser profiles set up for each user
- [ ] Phone charged, Expo Go logged in
- [ ] QR codes printed and ready
- [ ] Demo video file on phone (for upload scene)
- [ ] Wifi/connectivity verified
- [ ] Backup demo video cued up (if needed)

#### Practice Sessions

1. **Solo run-through** - Time yourself, identify stumbles
2. **Screen recording** - Watch playback, fix awkward moments
3. **Live audience** - Practice with colleague, get feedback
4. **Backup plan** - Know what to do if something fails

#### Acceptance Criteria

- [ ] Demo completes in 7-9 minutes
- [ ] All transitions are smooth
- [ ] No fumbling with accounts/devices
- [ ] Key "wow" moments land (QR scan, one-click module creation)
- [ ] Backup plan documented

---

### 4.4 Demo Materials

**Goal:** Professional supporting materials.

#### Printed QR Codes

Create print-ready QR sheets:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│     ┌───────────┐    ┌───────────┐    ┌───────────┐       │
│     │           │    │           │    │           │       │
│     │  [QR 1]   │    │  [QR 2]   │    │  [QR 3]   │       │
│     │           │    │           │    │           │       │
│     └───────────┘    └───────────┘    └───────────┘       │
│     Table Saw        Miter Saw        Dust Collection     │
│     Safety           Basics           Best Practices      │
│                                                             │
│     ────────────────────────────────────────────────────   │
│                                                             │
│     APEX CUSTOM CABINETS                                   │
│     Scan to start training                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Print on:
- Card stock (professional feel)
- Laminated sheets (for actual shop use demo)
- Regular paper (backup copies)

#### Browser Profiles

Set up Chrome/Firefox profiles:

| Profile | Account | Purpose |
|---------|---------|---------|
| BuildTrack - Mike | mike@apex.demo | Owner, setup wizard |
| BuildTrack - Dave | dave@apex.demo | Supervisor, dashboard |
| BuildTrack - Sarah | sarah@apex.demo | Admin, review queue |

#### Pre-Recorded Demo Video

Record a backup video in case:
- Live demo has technical issues
- Remote presentation without screen share
- Sending to prospects who missed live demo

**Recording tips:**
- Use OBS or Loom
- Record at 1080p minimum
- Include cursor highlighting
- Add light background music
- Keep under 5 minutes (condensed version)

#### Acceptance Criteria

- [ ] QR codes print cleanly and scan correctly
- [ ] Browser profiles switch instantly
- [ ] Demo video recorded and uploaded
- [ ] All materials tested on demo hardware

---

### 4.5 Final Testing

**Goal:** Verify everything works end-to-end.

#### Full Flow Test Checklist

Run through complete demo flow 3 times:

**Test 1: Happy Path**
- [ ] Owner registration completes
- [ ] Setup wizard saves all data
- [ ] Employee sees correct onboarding
- [ ] QR code scans and opens module
- [ ] Module content renders correctly
- [ ] Progress saves after completion
- [ ] Video upload succeeds
- [ ] Admin review queue shows upload
- [ ] Module creation from upload works
- [ ] New module appears in library
- [ ] Dashboard shows correct metrics
- [ ] Certification displays properly

**Test 2: Edge Cases**
- [ ] Slow network (throttle to 3G)
- [ ] Large video upload (>50MB)
- [ ] Quick succession of actions
- [ ] Browser back/forward navigation
- [ ] Session timeout and re-login

**Test 3: Recovery**
- [ ] What happens if video fails to load?
- [ ] What happens if API is slow?
- [ ] What happens if QR scan fails?
- [ ] Can you gracefully restart any scene?

#### Device Testing

| Device | Status |
|--------|--------|
| Desktop Chrome | ⬜ |
| Desktop Firefox | ⬜ |
| Desktop Safari | ⬜ |
| iPhone (Expo Go) | ⬜ |
| Android (Expo Go) | ⬜ |
| iPad (optional) | ⬜ |

#### Acceptance Criteria

- [ ] All tests pass
- [ ] No critical bugs discovered
- [ ] Recovery plan documented
- [ ] Demo hardware verified

---

## Demo Day Checklist

### Day Before

- [ ] Full test run on demo hardware
- [ ] Charge all devices overnight
- [ ] Print fresh QR codes
- [ ] Verify internet at demo location
- [ ] Load demo video file on phone
- [ ] Test screen sharing (if remote)
- [ ] Get good sleep!

### 1 Hour Before

- [ ] Open browser profiles
- [ ] Log into phone accounts
- [ ] Test QR code scan
- [ ] Test screen share
- [ ] Silence phone notifications
- [ ] Close unnecessary apps/tabs
- [ ] Have water nearby

### Go Time

- [ ] Smile, you've got this
- [ ] Speak slowly and clearly
- [ ] If something breaks, stay calm
- [ ] Have fun showing what you built!

---

## Completion Checklist

| Task | Status |
|------|--------|
| 4.1 Complete Demo Content | ⬜ |
| 4.2 Bug Fixes & Performance | ⬜ |
| 4.3 Demo Script & Rehearsal | ⬜ |
| 4.4 Demo Materials | ⬜ |
| 4.5 Final Testing | ⬜ |

---

## Phase Exit Criteria

Before declaring "Demo Ready":

- [ ] All 12-15 modules have complete content
- [ ] All 4 SOPs are written and formatted
- [ ] Zero critical bugs in demo flow
- [ ] Performance targets met
- [ ] Demo script memorized/internalized
- [ ] 3 successful complete run-throughs
- [ ] QR codes printed and tested
- [ ] Backup video recorded
- [ ] Demo hardware verified

---

## Success Metrics

After delivering the demo:

| Metric | Target |
|--------|--------|
| Demo completion | Finished without major issues |
| Audience engagement | Questions asked during/after |
| "Can I try it?" | At least one person asks |
| QR scan success | Works first time |
| Time | 7-9 minutes |

---

**Congratulations!** If you've completed all phases, you have a demo-ready product that showcases the full potential of BuildTrack. Now go show it to the world!

---

**Previous Phase:** [Phase 3: Advanced Features](./PHASE_3_ADVANCED_FEATURES.md)
**Back to Overview:** [Spec Overview](../SPEC_OVERVIEW.md)
