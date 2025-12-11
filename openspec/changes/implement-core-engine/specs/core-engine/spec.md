## ADDED Requirements

### Requirement: Engine Initialization
The system SHALL provide a clear entry point for engine initialization that configures all subsystems in the correct dependency order.

#### Scenario: Successful initialization with WebGL2
- **WHEN** engine is initialized with valid canvas and WebGL2 config
- **THEN** all subsystems SHALL be created in dependency order
- **AND** renderer SHALL be initialized with WebGL2 context
- **AND** init promise SHALL resolve successfully

#### Scenario: Fallback when WebGPU unavailable
- **WHEN** engine is configured for WebGPU but browser doesn't support it
- **THEN** engine SHALL fallback to WebGL2 automatically
- **AND** a warning event SHALL be emitted

#### Scenario: Initialization failure
- **WHEN** canvas is invalid or WebGL2 is not supported
- **THEN** init promise SHALL reject with descriptive error
- **AND** no partial initialization SHALL remain

### Requirement: Game Loop Management
The system SHALL implement a game loop with fixed timestep for physics and variable timestep for rendering.

#### Scenario: Fixed timestep physics update
- **WHEN** game loop is running
- **THEN** physics update SHALL be called with fixed 16.67ms timestep
- **AND** multiple physics steps MAY occur per frame if needed
- **AND** accumulated time SHALL not exceed MAX_FRAME_TIME

#### Scenario: Variable timestep rendering
- **WHEN** game loop is running
- **THEN** render SHALL be called once per frame with actual delta time
- **AND** interpolation factor SHALL be provided for smooth rendering

#### Scenario: Frame timing
- **WHEN** measuring performance
- **THEN** FPS counter SHALL be accurately calculated
- **AND** frame time histogram SHALL be available for profiling

### Requirement: Event System
The system SHALL provide a typed event bus for decoupled communication between subsystems.

#### Scenario: Event subscription
- **WHEN** a handler subscribes to an event
- **THEN** handler SHALL be called when event is emitted
- **AND** unsubscribe function SHALL properly remove handler

#### Scenario: Typed event data
- **WHEN** event is emitted
- **THEN** data SHALL match the expected type for that event
- **AND** TypeScript SHALL provide compile-time type checking

#### Scenario: Event ordering
- **WHEN** multiple handlers subscribe to same event
- **THEN** handlers SHALL be called in subscription order

### Requirement: Resource Management
The system SHALL manage loading and caching of resources (textures, shaders, audio).

#### Scenario: Texture loading
- **WHEN** texture is requested
- **THEN** system SHALL load and decode image
- **AND** create GPU texture resource
- **AND** cache for future requests

#### Scenario: Shader compilation
- **WHEN** shader is loaded
- **THEN** system SHALL compile vertex and fragment shaders
- **AND** link program
- **AND** cache uniform locations

#### Scenario: Preload manifest
- **WHEN** preload is called with manifest
- **THEN** all resources SHALL be loaded in parallel
- **AND** progress SHALL be reported via loadingProgress

### Requirement: Configuration System
The system SHALL provide flexible configuration with sensible defaults.

#### Scenario: Default values
- **WHEN** engine is initialized without explicit config
- **THEN** sensible defaults SHALL be applied

#### Scenario: Runtime configuration change
- **WHEN** configuration value is changed at runtime
- **THEN** affected systems SHALL update accordingly
- **AND** change event SHALL be emitted

### Requirement: Math Utilities
The system SHALL provide optimized math utilities for common 3D operations.

#### Scenario: Coordinate conversion
- **WHEN** converting world coordinates to chunk coordinates
- **THEN** result SHALL correctly identify containing chunk
- **AND** handle negative coordinates properly

#### Scenario: Index calculation
- **WHEN** converting local coordinates to array index
- **THEN** index SHALL be consistent with flat array storage
- **AND** be reversible back to coordinates