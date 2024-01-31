import mongoose, { Schema } from "mongoose";

const likeSchema = new mongoose.Schema(
    {
        video:{
            type:Schema.Types.ObjectId,
            ref:"Video"
        },
        tweet:{
            type:Schema.Types.ObjectId,
            ref:"Tweet"
        },
        likedBy:{
            type:Schema.Types.ObjectId,
            ref:"User"
        },
        comment:{
            type:Schema.Types.ObjectId,
            ref:"Comment"
        }
    },
    {
        timestamps: true
    }
)

export const Like = mongoose.model("Like",likeSchema);