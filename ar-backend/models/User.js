import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    comments: { type: Boolean, default: true },
    candidates: { type: Boolean, default: false },
    offers: { type: Boolean, default: false },
    push: {
        type: String,
        enum: ['everything', 'same_as_email', 'none'],
        default: 'everything'
    }
}, { _id: false });

const addressSchema = new mongoose.Schema({
    country: { type: String },
    street: { type: String },
    city: { type: String },
    region: { type: String },
    postalCode: { type: String },
}, { _id: false });

const profileSchema = new mongoose.Schema({
    username: { type: String, trim: true, unique: false }, // keep non-unique unless you need usernames to be unique
    about: { type: String, trim: true },
    avatarUrl: { type: String },        // maps to "Photo"
    coverUrl: { type: String },         // maps to "Cover photo"
    firstName: { type: String },
    lastName: { type: String },
    address: addressSchema,
    notifications: notificationSchema
}, { _id: false });

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },               // already present
    email: { type: String, required: true, unique: true },// already present
    passwordHash: { type: String, required: true },       // already present
    profile: profileSchema
}, { timestamps: true });

export default mongoose.model('User', userSchema);