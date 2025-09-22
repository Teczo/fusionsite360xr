// Re-export everything that exists…
export * from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// …plus provide the missing name as an alias:
export { mergeBufferGeometries as mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
