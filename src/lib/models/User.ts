import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const User = new Schema({
  id: {
    type: String,
    required: true
  },
  customProfileBanned: {
    type: Boolean,
    default: false
  },
  lastSeenAt: {
    type: Date,
    required: false,
    default: null
  }
}, {
  versionKey: false
});

export type UserType = mongoose.InferSchemaType<typeof User>;

export default mongoose.model('Users', User);