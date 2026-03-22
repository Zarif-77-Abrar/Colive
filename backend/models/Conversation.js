import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    relatedRoomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      default: null,
      // Links back to the room that triggered this conversation
      // via a BookingRequest acceptance
    },
  },
  { timestamps: true }
);

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;
