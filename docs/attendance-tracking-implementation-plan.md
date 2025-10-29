# Attendance Tracking Implementation Plan

## 📋 **Core Requirements:**
- Real-time event joining system
- Live attendance tracking during events
- Speaker material management per event
- Minimal UI for attendees, informative for admin/speakers

## ⏰ **Event Joining Logic:**
- **Join Button**: Becomes active exactly when event starts (not 15 mins before)
- **Join Action**: Marks user as "attended" and "joined" simultaneously
- **Multiple Joins**: Allowed (user has valid ticket), but attendance count doesn't increase
- **Attendance Count**: Only increments on first join per user

## 👥 **User Roles & Permissions:**

### **Attendees:**
- Can join events when they start
- See basic attendance metrics (e.g., "45 people joined")
- Access speaker materials only during event
- Minimal UI design

### **Speakers:**
- Can join events when they start
- See complete attendance reports
- Manage materials in invitation section
- Cannot change materials once event starts
- Informative UI design

### **Admins:**
- See complete attendance reports
- Real-time attendance dashboard
- Material management oversight
- Informative UI design

## 📁 **Material Management:**
- **Location**: Speaker invitation section (where they receive admin invitations)
- **Selection**: Speakers choose materials per event via checkboxes
- **Timing**: Materials locked once event starts
- **Visibility**: Attendees can access materials during event only
- **Lifespan**: Materials accessible throughout event duration

## 📊 **Attendance Tracking:**
- **Real-time Count**: Live updates as users join
- **Duplicate Prevention**: Multiple joins don't increase count
- **Status Tracking**: Track both "attended" and "joined" status
- **Report Data**: Total attendance vs current attendance for mid-event reports

## 🎨 **UI Design Requirements:**
- **Attendees**: Minimal, clean interface
- **Speakers/Admins**: Informative, detailed interface
- **Real-time Updates**: Live attendance counters
- **Material Access**: Easy access during events

## 🔧 **Technical Implementation Plan:**

### **Phase 1: Database Schema**
- Add `joinedAt` timestamp to `Booking` model
- Add `speakerJoinedAt` timestamp to `SpeakerInvitation` model
- Add `materialsSelected` array to `SpeakerInvitation` model
- Add `eventStartTime` validation for join button

### **Phase 2: API Endpoints**
- `POST /events/:eventId/join` - Attendee joins event
- `POST /events/:eventId/speaker-join` - Speaker joins event
- `GET /events/:eventId/live-attendance` - Real-time attendance data
- `PUT /speaker-invitations/:id/materials` - Update material selection

### **Phase 3: Frontend Implementation**
- Event joining interface with time-based access
- Live attendance dashboard
- Speaker material selection in invitation section
- Real-time updates and minimal UI design

## ⚠️ **Edge Cases to Handle:**
- User joins multiple times (prevent count increase)
- Event starts while user is on page (enable join button)
- Speaker changes materials after event starts (prevent)
- Materials access timing (only during event)
- Real-time updates for all user types

## 📈 **Future Report Implementation:**
- Total attendance vs current attendance
- Mid-event report generation
- Historical attendance data
- Export functionality

---

**Status**: Ready for implementation
**Created**: $(date)
**Last Updated**: $(date)
