import mongoose, { isValidObjectId } from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    if(!isValidObjectId(new mongoose.Types.ObjectId(videoId))){
        throw new ApiError("Invalid Video Id",400)
    }

    const videoComments = await Comment.aggregate([
        {
            $match:{
                video : new mongoose.Types.ObjectId(videoId)
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
                            fullName:1,
                            username:1,
                            avatar:1
                        }
                    }
                ]
            }
        },
        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"comment",
                as:"likes"
            }
        },
        {
            $addFields:{
                owner:{
                    $first : "$owner"
                },
                totalLikes: {
                    $size :"$likes"
                }
            }
        }
    ])

    const response = await Comment.aggregatePaginate(videoComments,{ page , limit })

    res.status(200).json(new ApiResponse(200,response,"Comments fetched successfully"))
})

const addComment = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const {content} = req.body

    if(!isValidObjectId(new mongoose.Types.ObjectId(videoId))){
        throw new ApiError("Invalid Video Id",400)
    }

    if(!content){
        throw new ApiError("Content is required",400)
    }

    const comment = await Comment.create({
        content,
        video : videoId,
        owner : req.user?._id
    })

    res
    .status(201)
    .json(new ApiResponse(201,comment,"Added Comment Successfully"))
})

const updateComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    const {content} = req.body

    if(!isValidObjectId(new mongoose.Types.ObjectId(commentId))){
        throw new ApiError("Invalid comment Id",400)
    }

    if(!content){
        throw new ApiError("Content is required",400)
    }

    const updatedComment = await Comment.updateOne(
        {
            _id : commentId,
            owner : req.user?._id
        },
        {
            $set:{
                content
            }
        }
    )

    if(!updatedComment){
        throw new ApiError("Unauthorized request or comment does not exist",401)
    }

    res
    .status(200)
    .json(new ApiResponse(200,updatedComment,"Updated Commented Successfully"))
})

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params

    if(!isValidObjectId(new mongoose.Types.ObjectId(commentId))){
        throw new ApiError("Invalid comment Id",400)
    }

    const deletedComment = await Comment.deleteOne({
        _id : commentId,
        owner : req.user?._id
    })

    if(!deletedComment){
        throw new ApiError("Unauthorized request or comment does not exist",401)
    }

    res
    .status(200)
    .json(new ApiResponse(200,deletedComment,"Deleted Commented Successfully"))
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }