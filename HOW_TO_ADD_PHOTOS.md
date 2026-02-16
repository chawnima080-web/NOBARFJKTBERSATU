# How to Add Real Member Photos

## Quick Guide

You have a composite image with all member photos. To add them to your website:

### Option 1: Manual Extraction (Recommended)
1. Open the composite image in an image editor (Photoshop, GIMP, Paint.NET, etc.)
2. Crop each member's photo individually
3. Save each photo as: `public/members/[member_name].jpg`
   - Example: `public/members/michelle_levia.jpg`
   - Use lowercase, replace spaces with underscores
4. The website will automatically load them!

### Option 2: Use Online Tools
1. Use a free online image splitter tool
2. Upload your composite image
3. Set grid to 6 columns x 9 rows (for the first section)
4. Download individual images
5. Rename and save to `public/members/`

### File Naming Convention
Each member needs their photo saved as:
- Michelle Levia → `michelle_levia.jpg`
- Mutiara Azzahra → `mutiara_azzahra.jpg`
- etc.

### Current Setup
The `members.js` file is already configured to look for photos in `/members/[name].jpg`.
Once you add the photos to the `public/members/` folder, they will appear automatically!

## Member List (for reference)
1. Michelle Levia
2. Mutiara Azzahra
3. Nayla Suji
4. Nina Tutachia
5. Oline Manuel
6. Raisha Syifa
7. Ribka Budiman
8. Shabilqis Naila
9. Victoria Kimberly
10. Abigail Rachel
... (and 44 more)

See `src/data/members.js` for the complete list.
