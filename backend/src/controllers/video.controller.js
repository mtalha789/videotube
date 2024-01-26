import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { deletedOnClouinary, uploadOnCloudinary } from "../utils/cloudinary.js"
import { v2 as cloudinary} from "cloudinary"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

    // Match condition for the aggregation pipeline
    const matchCondition = {};

    // Filter by user ID if provided
    if (userId) {
        matchCondition.owner = new mongoose.Types.ObjectId(userId);
    }

    // Text search based on the "query" parameter
    const textSearch = {};
    if (query) {
        textSearch.$text = { $search: query };
    }

    // Sorting based on "sortBy" and "sortType" parameters
    const sortCondition = {};
    if (sortBy && sortType) {
        sortCondition[sortBy] = sortType === 'asc' ? 1 : -1;
    }

    // Aggregation pipeline stages
    const pipeline = [
        {
            $match: {
                ...matchCondition,
                ...textSearch,
            },
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "owner",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            fullname: 1,
                            username: 1,
                            avatar: 1,
                        },
                    },
                ],
            },
        },
        {
            $sort: sortCondition,
        },
    ];

    // Execute the aggregation pipeline
    const videos = await Video.aggregate(pipeline);

    if (!videos || videos.length === 0) {
        throw new ApiError("No Videos Found", 404);
    }

    // Perform pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const limitedVideos = videos.slice(startIndex, endIndex);

    res.status(200).json(new ApiResponse(200, limitedVideos, "Videos Fetched Successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body
    // TODO: get video, upload to cloudinary, create video

    if([title,description].some(x => x?.trim() === "")){
        throw new ApiError("Title and Description are required", 400);
    }

    const videoFileLocalPath = req.files?.videoFile[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

    if (!videoFileLocalPath) throw new ApiError("Video file is Required", 400);

    if (!thumbnailLocalPath) throw new ApiError("Thumbnail file is Required", 400);

    const videoFile = await uploadOnCloudinary(videoFileLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if (!videoFile && !thumbnail) throw new ApiError("Video file and Thumbnail is required", 400);

    //duration of video
    const metadata = await cloudinary.api.resource(videoFile.public_id)
    const duration = metadata.duration;

    const video = await Video.create({
        title,
        description,
        videoFile: videoFile.url,
        thumbnail : thumbnail.url,
        duration
    })

    const uploadedVideo = await Video.findById(video._id).select("-isPublished")

    if(!uploadedVideo){
        throw new ApiError("Something went wrong while uploading video")
    }

    res
    .status(201)
    .json(new ApiResponse(201,uploadedVideo,"Video Uploaded Successfully"))
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    //using pipeline
    const video = await Video.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner",
                pipeline:[
                    {
                        $project:{
                            avatar:1,
                            fullName:1,
                            username:1
                        }
                    }
                ]
            }
        },
        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"video",
                as:"totalLikes"
            }
        },
        {
            $addFields:{
               likes : {
                $size : $totalLikes
               }
            }
        }
    ])

    // get video by id
    // const video = await Video.findById(videoId)

    console.log(video);
    if (!video) {
        throw new ApiError("Video Not Found", 404)
    }

    //if video is not published
    if(!video.isPublished && video.owner !== req.user?._id){
        throw new ApiError("Unauthorized request",401)
    }

    res
        .status(200)
        .json(new ApiResponse(200, video, "Video Fetched Successfully"))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const { title, description } = req.body;

    // Find the video by ID
    const video = await Video.findById(videoId);

    // Update video details if provided
    if (title) video.title = title;
    if (description) video.description = description;

    // Upload thumbnail to Cloudinary if a file is provided
    const thumbnailLocalPath = req.file?.path;
    const thumbnail = thumbnailLocalPath ? await uploadOnCloudinary(thumbnailLocalPath) : null;

    await deletedOnClouinary(video.thumbnail)

    // Update video thumbnail URL if a valid thumbnail is obtained
    if (thumbnail && thumbnail.url) video.thumbnail = thumbnail.url;

    // Save the updated video details
    await video.save({ validateBeforeSave: false });

    res.status(200).json(new ApiResponse(200, video, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const video = await Video.findOneAndDelete({ _id: videoId, owner: req.user._id });

    if (!video) {
        throw new ApiError("Video does not exist or unauthorized request", 404);
    }

    await Promise.all([deletedOnClouinary(video.thumbnail),deletedOnClouinary(video.videoFile)]);

    res.status(200).json(new ApiResponse(200, video, "Video deleted successfully"));
});


const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    const video = await Video.findOneAndUpdate(
        {_id: videoId, owner: req.user?._id},
        {
            $set:
                { 
                    isPublished: { $not : "$isPublished"} 
                }
        },
        { new: true }
    )

    if (!video) {
        throw new ApiError("Video does not exist or unauthorized request", 404);
    }

    res
    .status(200)
    .json(new ApiResponse(200,video,"Toggled published status"))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}