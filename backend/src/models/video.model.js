import mongoose,{Schema} from "mongoose"
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";


const videoSchema = new Schema(
    {
        thumbnail:{
            type:String,    //cloudinary
            required:true
        },
        videoFile:{
            type:String,    //cloudinary
            required:true
        },
        duration:{
            type:Number,    //cloudinary
            required:true
        },
        title:{
            type:String,
            required:true,
            index:true
        },
        description:{
            type:String,
            required:true,
            index:true
        },
        owner:{
            type:Schema.Types.ObjectId,
            ref:"User"
        },
        views:{
            type:Number,
            default:0
        },
        likes:{
            type:Number,
            default:0
        },
        isPublished:{
            type:Boolean,
            default:true
        }
    },
    {
        timestamps:true
    }
)

videoSchema.index({
    title:"text",
    description:"text"
})

videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model("Video",videoSchema);