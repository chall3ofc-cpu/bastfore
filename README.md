# Matkasse Manager

Instruction: You are an expert frontend developer building a flawless, high-fidelity production mobile web application. Follow every single rule below with 100% precision. Do not omit any features. Do not assume anything. Every single button, tab, and input element MUST be fully clickable, interactive, and functional. All user-facing text, menus, buttons, placeholders, and alerts MUST be in Swedish.

PROJECT NAME: BästFöre

DEVICE TARGET: Mobile-First Web App (Perfectly optimized for a smartphone screen).

DESIGN STYLE: Clean, modern, minimalist Scandinavian UI. High contrast, beautiful typography, intuitive micro-interactions, smooth animations.

=====================================================

GLOBAL APP STATE & DATA STRUCTURE

=====================================================

The app must manage a list of food items. Every item in the database MUST have these exact properties:

- id (Unique string/number)

- name (String, e.g., "Arla Mellanmjölk 1.5L")

- expirationDate (Date object or ISO string)

- status (String: "pantry" OR "freezer" OR "consumed")

- dateAdded (Date object)

Initialize the app with 3 Swedish mock items on first load so it never looks empty:

1. Name: "Blandfärs 500g", Status: "pantry", Expiration: Current Date (Should trigger RED status).

2. Name: "Vispgrädde 2.5dl", Status: "pantry", Expiration: Current Date + 3 days (Should trigger YELLOW status).

3. Name: "Herrgårdsost", Status: "pantry", Expiration: Current Date + 12 days (Should trigger GREEN status).

=====================================================

GLOBAL NAVIGATION & LAYOUT

=====================================================

The app must feature a permanent Bottom Navigation Bar fixed at the very bottom of the screen. It has exactly 3 buttons/tabs with Swedish labels:

1. "Kylen & Skafferiet" (Home/Refrigerator icon)

2. "Blippa & Lägg till" (Camera/Plus icon)

3. "Inställningar" (Gear icon)

- CLICK BEHAVIOR: Clicking a tab must instantly switch the main view container to show that specific screen without reloading the page. Add an active visual state (different color/fill) to the selected tab icon.

=====================================================

DETAILED SCREEN 1: KYLEN & SKAFFERIET (HOME VIEW)

=====================================================

This screen shows the food currently at home, separated into fridge and freezer.

1. TOP HEADER SECTION:

- Title text: "Mitt Kök" (Large, bold, left-aligned).

- Subheader: "Håll koll på dina bäst före-datum" (Small muted text).

- Toggle Segment Buttons (Pill-shaped toggle) directly below the title:

  * Button 1 text: "Kylen" (Active by default).

  * Button 2 text: "Frysen".

  * CLICK BEHAVIOR: Clicking "Kylen" filters the list below to show only items with status="pantry". Clicking "Frysen" filters the list to show only items with status="freezer".

2. THE MATKASSE LIST:

- SORTING ALGORITHM: The list MUST automatically sort items by `expirationDate`. The item that expires SOONEST must always be at the very top.

- EMPTY STATE: If the list contains 0 items, hide the list and display a centered message: "Ditt kök är tomt! Tryck på 'Blippa & Lägg till' för att packa upp din matkasse."

3. ITEM CARD DESIGN & VISUAL URGENCY (COLOR CODING):

Every item row must be a card with clean padding and explicit visual states:

- RED URGENCY STATE (0 to 2 days remaining, or already expired): Card background must be a soft light red, or have a distinct red border. Display a red warning icon ⚠️ next to the text. Dynamic text example: "Går ut idag" or "Utgången!" or "1 dag kvar".

- YELLOW URGENCY STATE (3 to 5 days remaining): Card background must be a soft light yellow/amber. Dynamic text example: "3 dagar kvar" or "5 dagar kvar".

- GREEN URGENCY STATE (6 or more days remaining): Card background must be a soft light green. Dynamic text example: "12 dagar kvar".

4. CARD ACTIONS (INTERACTIVE BUTTONS):

On the right side of every single food item card, render exactly two functional buttons:

- BUTTON 1: "Uppäten" (Checkmark icon ✅). 

  * CLICK BEHAVIOR: Clicking this changes the item's status to "consumed". The card must instantly execute a smooth fade-out CSS animation and be deleted from the active view.

- BUTTON 2: "Frys in" (Snowflake icon ❄️). 

  * VISIBILITY: This button only appears when viewing the "Kylen" list. 

  * CLICK BEHAVIOR: Clicking this changes the item's status to "freezer". It pauses its countdown and moves it to the Freezer section.

  * REVERSE BEHAVIOR: When viewing the "Frysen" list, this button text/icon changes to "Ta ut" (Home/Arrow-out icon). Clicking it changes status back to "pantry".

=====================================================

DETAILED SCREEN 2: BLIPPA & LÄGG TILL (SCAN VIEW)

=====================================================

Designed for fast input when unpacking ICA/Coop grocery bags. The user must be able to log 20 items in a row without the interface resetting or forcing them to leave the screen.

1. THE SCANNER VIEWPORT:

- The upper 50% of the screen simulates a camera interface. It must render a dark container frame with a pulsing, glowing horizontal red laser line in the middle to simulate a barcode scanner.

- Overlay text: "Placera streckkoden i rutan".

- MANUAL FALLBACK COMPONENT: Directly below the camera simulator, render a clickable text button: "Går det inte att scanna? Skriv namn manuellt".

  * CLICK BEHAVIOR: Clicking this opens a clean modal popup or text field allowing the user to type a custom product name (e.g., "Krossade Tomater").

2. BARCODE SIMULATION ENGINE (FOR TESTING):

- To make this fully functional, render 4 mock barcode buttons underneath the scanner interface labeled with actual Swedish products:

  * Button A: "Simulera Mjölk-skanning" (Triggers Barcode lookup -> auto-populates name as "Arla Mellanmjölk 1.5L")

  * Button B: "Simulera Bröd-skanning" (Triggers Barcode lookup -> auto-populates name as "Skogaholmslimpa")

  * Button C: "Simulera Grädde-skanning" (Triggers Barcode lookup -> auto-populates name as "Vispgrädde 36%")

  * Button D: "Simulera Okänd Vara" (Triggers lookup failure -> auto-opens a text input field asking: "Hittade inte varan. Vad heter produkten?")

3. AUTOMATIC BOTTOM-SHEET SLIDE-UP PANEL:

The exact millisecond a barcode button is clicked or a manual name is entered, a bottom-sheet panel MUST slide up smoothly from the bottom, overlaying the lower part of the screen.

- THE PANEL CONTENT:

  * Title: The recognized product name in bold text.

  * Prompt text: "När är sista förbrukningsdag / bäst före?"

  * 4 INTERACTIVE QUICK-DATE BUTTONS:

    1. Button 1: "+2 Dagar" -> CLICK BEHAVIOR: Automatically calculates Current Date + 2 days, updates the date state, and highlights this button as selected.

    2. Button 2: "+5 Dagar" -> CLICK BEHAVIOR: Automatically calculates Current Date + 5 days, updates the date state, and highlights this button as selected.

    3. Button 3: "+1 Vecka" -> CLICK BEHAVIOR: Automatically calculates Current Date + 7 days, updates the date state, and highlights this button as selected.

    4. Button 4: "Välj datum" -> CLICK BEHAVIOR: Opens the device's native calendar date-picker UI for precision entry.

  * SUBMIT BUTTON: A large, full-width button at the bottom of the sheet labeled "LÄGG TILL I KYLEN".

    - CLICK BEHAVIOR: Saves the food item to the list, plays a visual checkmark animation, clears the scanner inputs, hides the bottom sheet panel, AND KEEPS THE CAMERA SCANNED ACTIVE so the user can immediately scan another product.

=====================================================

DETAILED SCREEN 3: INSTÄLLNINGAR (SETTINGS & NOTIFICATION LOGIC)

=====================================================

This screen configures the custom countdown reminder engine.

1. CONFIGURATION INTERFACE:

- OPTION A: "Påminn mig från (Dagar innan)". 

  * UI: A clean native dropdown selector or horizontal segmented list.

  * Options: "1 dag innan", "2 dagar innan", "3 dagar innan", "4 dagar innan", "5 dagar innan", "7 dagar innan".

  * Default State: Pre-selected to "3 dagar innan".

- OPTION B: "Tid för påminnelse".

  * UI: An interactive digital time-picker interface.

  * Default State: Pre-set to "11:00".

2. THE DAILY COUNTDOWN ALARM ALGORITHM (CRITICAL BUNDLING LOGIC):

The app must follow this exact calculation logic to avoid sending individual alerts or alerting at midnight:

- When the internal clock hits the time selected in Option B (e.g., 11:00 AM):

- The app calculates a target date threshold: `Current Date + Selected Days in Option A (e.g., 3 days)`.

- It filters the food list to find all items where `status === "pantry"` AND `expirationDate <= target date threshold`.

- It bundles ALL matching items into ONE single aggregated Swedish notification payload.

- SIMULATION ON-SCREEN: Since real-world push notifications take days to run, you MUST build a large, prominent button on this screen labeled: "🧪 Testa påminnelser direkt".

  * CLICK BEHAVIOR: Clicking this button instantly executes the algorithm above using the current pantry data. It triggers a beautiful system-style modal popup alert at the top of the screen simulating the notification.

  * EXPECTED POPUP LAYOUT EXAMPLE (If user has 3 items expiring within the window):

    - Title: "⚠️ 3 varor behöver ätas upp snart!"

    - Body: 

      * "- Blandfärs 500g (Går ut idag - Action krävs!)"

      * "- Vispgrädde 2.5dl (2 dagar kvar - Laga något gott!)"

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b04bc2c9-6d9e-4d33-99c6-a5376e065685).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
