import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  name: String,
  type: String, // "model" or "image"
  url: String,
  thumbnail: { type: String }, // ✅ added thumbnail support
  uploadedAt: { type: Date, default: Date.now },
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    z: { type: Number, default: 0 },
  },
  rotation: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    z: { type: Number, default: 0 },
  },
  scale: {
    x: { type: Number, default: 1 },
    y: { type: Number, default: 1 },
    z: { type: Number, default: 1 },
  },
});

export default mongoose.model('File', fileSchema);
