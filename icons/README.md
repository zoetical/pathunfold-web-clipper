# Icon Generation Instructions

The PathUnfold logo file "pathunfold logo 3.png" needs to be converted to the following sizes:

## Required Icon Sizes:
- icon16.png - 16x16 pixels (for toolbar)
- icon48.png - 48x48 pixels (for extension management page)
- icon128.png - 128x128 pixels (for Chrome Web Store)

## How to Create Icons:

### Using ImageMagick (recommended):
```bash
# Install ImageMagick if not installed
# macOS: brew install imagemagick
# Ubuntu: sudo apt-get install imagemagick

# Convert the logo to different sizes
convert "pathunfold logo 3.png" -resize 16x16 icons/icon16.png
convert "pathunfold logo 3.png" -resize 48x48 icons/icon48.png
convert "pathunfold logo 3.png" -resize 128x128 icons/icon128.png
```

### Using Online Tools:
1. Visit https://www.iloveimg.com/resize-image
2. Upload "pathunfold logo 3.png"
3. Resize to 16x16, 48x48, and 128x128 separately
4. Save each size in the icons/ folder

### Using Preview (macOS):
1. Open "pathunfold logo 3.png" in Preview
2. Go to Tools → Adjust Size
3. Set dimensions to 16x16, save as icon16.png
4. Repeat for 48x48 and 128x128

### Alternative: Simple SVG Creation
If you want a simple placeholder icon, you can use the following SVG template:

```svg
<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" fill="#007bff" rx="20"/>
  <text x="64" y="70" font-family="Arial" font-size="64" fill="white" text-anchor="middle">P</text>
</svg>
```

Save this as icons/icon.svg and Chrome will automatically use it for all sizes.

Note: The icons should be in PNG format for best compatibility across all browsers.