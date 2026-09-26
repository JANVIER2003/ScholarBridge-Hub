# ScholarBridge Hub

**Bridging Ambition to Global Opportunity**

A responsive student opportunity platform built with HTML, CSS, vanilla JavaScript modules, and Firebase Authentication, Cloud Firestore, and Cloud Storage. Public opportunity listings are read from Firestore; administrators manage posts through `/admin/` without editing the front-end source.

Contact: [nybzjnvr@gmail.com](mailto:nybzjnvr@gmail.com) · +250 784 315 928

## Run locally

Serve the project over HTTP; ES modules and Firebase do not work reliably from a `file://` URL. In VS Code, use Live Server and open `index.html`, or use any static web server. Add the served hostname to Firebase Authentication's authorized domains (for local development, `localhost`).

## Firebase setup

1. Create a Firebase project and register a Web app in Firebase Console.
2. Copy the Web app configuration values into `firebaseConfig` in `js/firebase-config.js`. The Firebase web config is public by design; access control is enforced by Authentication and the rules, not by hiding these values.
3. Create a Cloud Firestore database and a Cloud Storage bucket.
4. In Authentication, enable the Email/Password provider. Create administrator accounts from the Firebase Console; there is no public admin-signup page.
5. Copy each administrator's Authentication UID. In Firestore, create an `admins` document whose document ID is that UID and whose data is `{ "active": true }`. Set `active` to `false` to revoke access.
6. Publish `firestore.rules` and `storage.rules` from the Firebase Console, or deploy them with the Firebase CLI after selecting the project (`firebase use <project-id>` then `firebase deploy --only firestore:rules,storage`).
7. Serve the website over HTTP and sign in at `/admin/index.html`.

Do not make administrator documents writable from the app. Bootstrap or revoke admins using a trusted Firebase Console/administrative process. Keep Firebase service-account credentials out of this static client project.

## Firebase services and access

- Public clients can read opportunity documents and images.
- Only signed-in users with an active `admins/{uid}` allowlist document can create, edit, or delete posts or upload/delete images.
- Admin dashboard access is checked in the UI, but the Firestore and Storage rules are the actual security boundary.
- The public site reads post documents and calculates active/expired status at runtime. It never deletes expired Firestore records. The admin dashboard retains expired posts until an administrator manually deletes them.
- Listings with `deleted: true` are hidden by the application; normal manual deletion removes the Firestore document.

## Post document

The `posts` collection uses documents with these fields:

```text
title, organization, category, country, location
imageUrl, imagePath, description, eligibility, requirements
programmes (array), minimumGrade, additionalInformation
deadlineDate (YYYY-MM-DD), deadlineTime (HH:mm or empty)
timezone (IANA name), noFixedDeadline (boolean)
applicationLink, contact, createdAt, updatedAt, deleted
```

`createdAt` and `updatedAt` are Firestore server timestamps. Date-only deadlines remain active through the entire deadline date in the selected IANA timezone. A deadline time makes that exact local time the expiry instant. `Africa/Kigali` is the form default. A missing application link is never invented; the card and details view clearly indicate that one was not provided.

## Structure

- `index.html` and `pages/`: public homepage, category listings, opportunity details, about and contact
- `js/`: Firebase setup, Firestore access, search and timezone-aware deadline utilities
- `admin/`: authenticated dashboard and create/edit/delete workflows
- `css/`: public responsive design and admin styling
- `firestore.rules`, `storage.rules`, `firebase.json`: deployment configuration

## Notes

This repository does not contain Firebase project credentials or live opportunity data. Configure a Firebase project and add posts through the admin portal before the public opportunity sections can display live results. Opportunity details should always be verified against the official organization/application source.
