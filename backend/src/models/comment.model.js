import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const { Schema, default: mongoose } = require("mongoose");


const commentSchema = new Schema({
    content:{
        type:String,
        required:true
    },
    video:{
        type:Schema.Types.ObjectId,
        ref:"Video"
    },
    tweet:{
        type:Schema.Types.ObjectId,
        ref:"Tweet"
    },
    owner:{
        type:Schema.Types.ObjectId,
        ref:"User"

    }
},{timestamps:true})

commentSchema.plugin(mongooseAggregatePaginate)

export const Comment = mongoose.model("Comment",commentSchema)