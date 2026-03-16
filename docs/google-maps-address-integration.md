# Google Maps Address Integration

## Overview

This feature integrates Google Maps into the user profile's address field, replacing the basic text input with an interactive map-based address picker. Users can search for addresses using Google Places Autocomplete, click on the map to pin their location, and have their address visually verified.

## Features

- **Google Places Autocomplete** — Type-ahead search for addresses with suggestions from Google
- **Interactive Map** — Dark-themed Google Map displayed in both edit and view modes
- **Click-to-Pin** — Users can click anywhere on the map to set their address (reverse geocoded automatically)
- **Address Verification** — Addresses selected via autocomplete or map click are marked as "✓ Verified"
- **Read-Only Map View** — Verified addresses display a mini-map on the Personal Details tab
- **Fallback** — If no API key is configured, a manual text input is shown with a helpful warning

## Architecture

### Backend

**User Model** (`Backend/backend-inter/models/user.js`)

The user schema now includes an `addressLocation` sub-document alongside the existing `address` string:

```js
address: { type: String, default: "" },  // formatted address text
addressLocation: {
  lat: { type: Number, default: null },       // latitude
  lng: { type: Number, default: null },       // longitude
  placeId: { type: String, default: "" },     // Google Place ID
  verified: { type: Boolean, default: false } // true if selected from Google
}
```

**User Controller** (`Backend/backend-inter/controllers/userController.js`)

The `updateUserProfile` endpoint now accepts `addressLocation` in the allowed fields list.

### Frontend

**GoogleMapAddressPicker Component** (`Frontend/my-react-app/src/components/GoogleMapAddressPicker.jsx`)

A reusable React component that provides:

| Prop | Type | Description |
|------|------|-------------|
| `address` | `string` | Current formatted address text |
| `addressLocation` | `object` | `{ lat, lng, placeId, verified }` |
| `onAddressChange` | `function` | Callback: `({ address, addressLocation }) => void` |
| `readOnly` | `boolean` | If `true`, shows map only (no editing) |

**Profile Page** (`Frontend/my-react-app/src/pages/Profile.jsx`)

- Edit Modal: Plain text input replaced with `GoogleMapAddressPicker`
- Personal Details tab: Shows verified badge + read-only map when coordinates exist
- Header: Shows "✓ Verified" badge next to address

## Setup

### 1. Get a Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable these APIs:
   - **Maps JavaScript API**
   - **Places API**
4. Create an API key under **APIs & Services → Credentials**
5. (Recommended) Restrict the key to your domain

### 2. Configure the API Key

Edit `Frontend/my-react-app/.env`:

```env
VITE_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

### 3. Install Dependencies

```bash
cd Frontend/my-react-app
npm install
```

The `@react-google-maps/api` package is already added to `package.json`.

### 4. Start the App

```bash
npm run dev
```

## User Flow

1. **Navigate** to Profile → Personal Details → Click "Edit"
2. **Type** your delivery address in the search box — autocomplete suggestions appear
3. **Select** a suggestion — the map zooms in with a pin on the exact location
4. **Fine-tune** by dragging the pin to the precise spot (address updates automatically via reverse geocode)
5. Click **"✓ Confirm This Location"** — the address locks in with a green verified badge
6. To change, click the **"Change"** button to unlock and search again
7. Click **Save Changes** — address + coordinates are saved to the database
8. The **Personal Details** tab now shows the verified address with a read-only map

## Data Flow

```
User types in search box
  → Google Places Autocomplete shows suggestions
  → User selects a place
  → Map zooms to location, draggable pin placed
  → Stage = "previewing" (user can drag pin to fine-tune)
  → Reverse geocode updates address on pin drag
  → User clicks "✓ Confirm This Location"
  → Stage = "locked" — address + coords locked in UI
  → editForm updated with { address, addressLocation }
  → User clicks Save → PUT /api/users/profile
  → Backend stores address (string) + addressLocation (object)
  → Profile refreshed with verified address + map
```

### Component Stages

| Stage | Description |
|-------|-------------|
| `searching` | Search input visible, user typing, map shows default view |
| `previewing` | Place selected, pin on map (draggable), "Confirm" button shown |
| `locked` | Address confirmed, search hidden, green verified card shown, "Change" button available |

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@react-google-maps/api` | ^2.x | React wrapper for Google Maps JavaScript API |

## Notes

- The map uses a dark theme to match the application's UI
- Default center is set to Sri Lanka (`7.8731, 80.7718`) — adjust `DEFAULT_CENTER` in `GoogleMapAddressPicker.jsx` as needed
- If the user types an address manually without selecting from autocomplete, it is saved as unverified (`verified: false`)
- The Google Maps API key should **never** be committed to version control — it's in `.env` which is gitignored

## Checkout Shipping Address Integration

### How It Works

The checkout page (`CheckoutPage.jsx`) follows the standard e-commerce pattern:

1. **Default Address** — When the user reaches checkout, their saved profile address is pre-selected as the shipping address
2. **Ship to Different Address** — A radio-style toggle lets them enter a completely new address using the Google Map picker
3. **Order Summary** — The right-side panel shows a live "Delivering To" preview of the selected address

### Address Options at Checkout

| Option | Description |
|--------|-------------|
| 🏠 **Default Address** | Pre-filled from user profile. Shows verified badge + mini-map if the address was verified via Google Maps. Only asks for city + postal code to complete. |
| 📍 **Ship to Different Address** | Full Google Map address picker with autocomplete, map click, and draggable marker. Plus manual fields for name, phone, city, postal code. |

### Data Stored with Each Order

The `shippingAddress` in the order model now includes optional geolocation fields:

```js
shippingAddress: {
  fullName: String,    // required
  phone: String,       // required
  street: String,      // required
  city: String,        // required
  postalCode: String,  // required
  lat: Number,         // optional — from Google Maps
  lng: Number,         // optional — from Google Maps
  placeId: String,     // optional — Google Place ID
  verified: Boolean    // true if selected via map
}
```

### Files Changed

| File | Change |
|------|--------|
| `Frontend/.../pages/CheckoutPage.jsx` | Added profile address fetch, address source toggle, Google Map picker integration |
| `Backend/.../models/order.js` | Added `lat`, `lng`, `placeId`, `verified` to `shippingAddressSchema` |
