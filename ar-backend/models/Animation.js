// models/Animation.js
import mongoose from 'mongoose';

const vec3 = {
    type: [Number],
    validate: {
        validator: (arr) => Array.isArray(arr) && arr.length === 3 && arr.every((n) => typeof n === 'number' && isFinite(n)),
        message: 'Axis must be [x,y,z]',
    },
    default: [0, 1, 0],
};

const point3 = {
    type: [Number],
    validate: {
        validator: (arr) => Array.isArray(arr) && arr.length === 3 && arr.every((n) => typeof n === 'number' && isFinite(n)),
        message: 'Point must be [x,y,z]',
    },
    required: true,
};

const baseBehavior = {
    enabled: { type: Boolean, default: true },
    startDelayMs: { type: Number, min: 0, default: 0 },
    type: { type: String, enum: ['rotateSelf', 'orbit', 'translatePath'], required: true },
};

// rotateSelf
const RotateSelfSchema = new mongoose.Schema({
    ...baseBehavior,
    type: { type: String, enum: ['rotateSelf'], required: true },
    axis: vec3,
    degreesPerSecond: { type: Number, required: true }, // allow negative for direction
    loop: { type: Boolean, default: true },
}, { _id: false });

// orbit
const OrbitSchema = new mongoose.Schema({
    ...baseBehavior,
    type: { type: String, enum: ['orbit'], required: true },
    targetObjectId: { type: String, required: true },
    axis: vec3,
    degreesPerSecond: { type: Number, required: true },
    radius: { type: Number, min: 0, required: true },
    initialAngleDeg: { type: Number, default: 0 },
    loop: { type: Boolean, default: true },
}, { _id: false });

// translatePath
const TranslatePathSchema = new mongoose.Schema({
    ...baseBehavior,
    type: { type: String, enum: ['translatePath'], required: true },
    points: { type: [point3], validate: [(arr) => Array.isArray(arr) && arr.length >= 2, 'Need at least 2 points'] },
    durationMs: { type: Number, min: 1, required: true },
    loop: { type: Boolean, default: false },
    closed: { type: Boolean, default: false },
    easing: { type: String, enum: ['linear', 'easeIn', 'easeOut', 'easeInOut'], default: 'linear' },
}, { _id: false });

const BehaviorUnionSchema = new mongoose.Schema({
    // one of the three: validate by `type`
}, { _id: false, strict: false });

const AnimationSchema = new mongoose.Schema({
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    objectId: { type: String, required: true, index: true }, // ID inside your scene array
    enabled: { type: Boolean, default: true },
    behaviors: {
        type: [BehaviorUnionSchema],
        validate: {
            validator: (arr) => Array.isArray(arr) && arr.length > 0,
            message: 'At least one behavior required',
        },
        default: [],
    },
    version: { type: Number, default: 1 },
}, { timestamps: true });

// Unique: one animation doc per (project, object)
AnimationSchema.index({ projectId: 1, objectId: 1 }, { unique: true });

/** Helpers: normalize axis vectors and per-type checks */
function normalizeAxis(axis) {
    if (!Array.isArray(axis) || axis.length !== 3) return [0, 1, 0];
    const [x, y, z] = axis.map(Number);
    const len = Math.hypot(x, y, z);
    if (!isFinite(len) || len === 0) return [0, 1, 0];
    return [x / len, y / len, z / len];
}

function coerceBehavior(b) {
    if (!b || typeof b !== 'object') return null;
    const t = b.type;
    if (t === 'rotateSelf') {
        return {
            ...b,
            axis: normalizeAxis(b.axis ?? [0, 1, 0]),
            enabled: b.enabled !== false,
            loop: b.loop !== false,
            startDelayMs: Math.max(0, Number(b.startDelayMs ?? 0)),
            degreesPerSecond: Number(b.degreesPerSecond ?? 0),
        };
    }
    if (t === 'orbit') {
        return {
            ...b,
            axis: normalizeAxis(b.axis ?? [0, 1, 0]),
            enabled: b.enabled !== false,
            loop: b.loop !== false,
            startDelayMs: Math.max(0, Number(b.startDelayMs ?? 0)),
            degreesPerSecond: Number(b.degreesPerSecond ?? 0),
            radius: Math.max(0, Number(b.radius ?? 0)),
            initialAngleDeg: Number(b.initialAngleDeg ?? 0),
            targetObjectId: String(b.targetObjectId || ''),
        };
    }
    if (t === 'translatePath') {
        const points = Array.isArray(b.points) ? b.points.map(p => [Number(p[0]), Number(p[1]), Number(p[2])]) : [];
        return {
            ...b,
            enabled: b.enabled !== false,
            loop: !!b.loop,
            closed: !!b.closed,
            startDelayMs: Math.max(0, Number(b.startDelayMs ?? 0)),
            durationMs: Math.max(1, Number(b.durationMs ?? 1)),
            easing: ['linear', 'easeIn', 'easeOut', 'easeInOut'].includes(b.easing) ? b.easing : 'linear',
            points,
        };
    }
    return null;
}

AnimationSchema.pre('validate', function (next) {
    if (Array.isArray(this.behaviors)) {
        this.behaviors = this.behaviors
            .map(coerceBehavior)
            .filter(Boolean);
    }
    next();
});

const Animation = mongoose.model('Animation', AnimationSchema);
export default Animation;
