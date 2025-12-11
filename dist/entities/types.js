export class Component {
}
export class System {
    constructor() {
        this.priority = 0;
        this.dependencies = [];
        this.enabled = true;
    }
    init() { }
    update(deltaTime) { }
    destroy() { }
}
export var EntityPriority;
(function (EntityPriority) {
    EntityPriority[EntityPriority["CRITICAL"] = 0] = "CRITICAL";
    EntityPriority[EntityPriority["HIGH"] = 1] = "HIGH";
    EntityPriority[EntityPriority["NORMAL"] = 2] = "NORMAL";
    EntityPriority[EntityPriority["LOW"] = 3] = "LOW";
})(EntityPriority || (EntityPriority = {}));
//# sourceMappingURL=types.js.map