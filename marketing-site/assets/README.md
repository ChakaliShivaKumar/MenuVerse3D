# Assets Folder

This folder contains static assets for the marketing site.

## Files Needed

### logo.png
- Restaurant/company logo
- Recommended size: 200x200px or larger (square format)
- Format: PNG with transparency

### demo-model.glb
- 3D model file for the demo section
- Format: GLB (binary glTF)
- This will be displayed using `<model-viewer>` component
- You can generate this using tools like:
  - Blender (export as GLB)
  - Online converters
  - 3D modeling software

### images/
- Folder for additional images
- Can include screenshots, product photos, etc.

## Usage

To use the logo in the HTML, update the navigation section:
```html
<img src="assets/logo.png" alt="3D Tech-Menu Logo" class="h-10">
```

To use the demo model, update the demo section:
```html
<model-viewer 
    src="assets/demo-model.glb" 
    auto-rotate 
    camera-controls
    style="width: 100%; height: 100%;">
</model-viewer>
```
