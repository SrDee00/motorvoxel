# MotorVoxel Demo

This demo showcases the MotorVoxel engine with a basic voxel world visualization.

## How to Run the Demo

### Option 1: Using a Web Server

1. Install a simple web server (if you don't have one):
   ```bash
   npm install -g http-server
   ```

2. Start the server from the project root:
   ```bash
   http-server
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:8080/demo/demo.html
   ```

### Option 2: Using VSCode Live Server

1. Install the "Live Server" extension in VSCode
2. Right-click on `demo/demo.html`
3. Select "Open with Live Server"

### Option 3: Direct File Access (Limited)

You can open `demo/demo.html` directly in your browser, but some features may not work due to CORS restrictions.

## Demo Features

- **Voxel World Visualization**: See the generated voxel world
- **Camera Controls**: Move around with WASD and mouse
- **Performance Stats**: FPS, chunk count, and position display
- **Debug Controls**: Toggle wireframe and chunk borders
- **Fullscreen Mode**: Immersive viewing experience

## Controls

- **WASD**: Move forward/backward/left/right
- **Mouse**: Look around
- **Space**: Jump (will be implemented)
- **1-9**: Select different block types (will be implemented)
- **Left Click**: Place block (will be implemented)
- **Right Click**: Break block (will be implemented)

## Technical Details

The demo integrates:
- Core Engine with WebGL rendering
- Voxel World generation
- Chunk meshing and rendering
- Camera system
- Basic UI overlay

## Troubleshooting

If the demo doesn't work:
1. Check browser console for errors (F12)
2. Ensure you're using a modern browser (Chrome, Firefox, Edge)
3. Make sure WebGL is enabled in your browser
4. Try clearing browser cache

## Future Enhancements

This demo will be expanded with:
- Block interaction (placing/breaking)
- Entity rendering
- Advanced lighting
- Texture support
- Network multiplayer