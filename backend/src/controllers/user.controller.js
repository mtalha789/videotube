import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import JWT from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import { extractPublicId } from "cloudinary-build-url";
import mongoose from "mongoose";

const cookieOptions = {
    httpOnly: true,
    secure: true
}

const generateAccessToken = async (userid) => {
    try {
        const user = await User.findById(userid);

        const refreshToken = await user.generateRefreshToken();
        const accessToken = await user.generateAccessToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
};

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    const { email, fullName, password, username } = req.body;
    console.log("email : ", email);

    if (
        [email, fullName, username, password].some((field) => field?.trim() === "")
    )
        throw new ApiError("All Fields are required", 400);

    const userExist = await User.findOne({
        $or: [{ email }, { username }],
    });
    if (userExist)
        throw new ApiError("User with email or username already exists", 409);

    const avatarLocalPath = req.files?.avatar[0]?.path;

    let coverImageLocalPath;
    if (
        req.files &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0
    ) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) throw new ApiError("Avatar file is Required", 400);

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) throw new ApiError("Avatar file is required", 400);

    const user = await User.create({
        fullName,
        username: username.toLowerCase(),
        avatar: avatar.url,
        coverImage: coverImage.url,
        password,
        email,
    });
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser)
        throw new ApiError("Something went wrong while registering the user", 500);

    res
        .status(201)
        .json(new ApiResponse(201, createdUser, "User Registered Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;

    if (!email && !username) {
        throw new ApiError("Username or email is required", 400);
    }

    const user = await User.findOne({
        $or: [{ email }, { username }],
    });

    if (!user) {
        throw new ApiError("User do not exist", 404);
    }

    const isPasswordCorrect = await user.isPasswordCorrect(password);

    if (!isPasswordCorrect) {
        throw new ApiError("Invalid user credentials", 401);
    }

    const { refreshToken, accessToken } = generateAccessToken(user._id);

    const loggedInUser = User.findById(user._id).select(
        "-password -refreshToken"
    );

    res
        .status(200)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .cookie("accessToken", accessToken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, refreshToken, accessToken
                },
                "User Logged In Successfully"
            )
        )
});

const logoutUser = asyncHandler(async (req, res) => {
    const user = req?.user
    await User.findByIdAndUpdate(
        user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(
            new ApiResponse(
                200,
                {},
                "Logged out successfully"
            )
        )
})

const refereshAccessToken = asyncHandler(async (req, res) => {
    const reqRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!reqRefreshToken) {
        throw new ApiError("unauthorized request")
    }

    const decodedToken = JWT.verify(reqRefreshToken)

    const user = User.findById(decodedToken._id)

    if (!user) {
        throw new ApiError("Invalid Refresh Token", 401)
    }

    if (user.refreshToken !== reqRefreshToken) {
        throw new ApiError("Refresh token is expired or used", 401)
    }

    const { accessToken, refreshToken } = await generateAccessToken(user._id)

    res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                { refreshToken },
                "Refreshed Access Token Successfully"
            )
        )
})

const getCurrentUser = asyncHandler(async (req, res) => {
    res.status(
        200,
        {
            user: req.user
        },
        "current user fetched"
    )
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPass, newPass } = req.body

    const user = await User.findById(req.user._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPass)

    if (!isPasswordCorrect) {
        throw new ApiError("Invalid old password", 400)
    }

    user.password = newPass
    await user.save({ validateBeforeSave: false })

    res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "password changed successfully"
            )
        )
})

const updateAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath)
        throw new ApiError("Avatar file is required", 400)

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar?.url) {
        throw new ApiError("Error while uploading avatar")
    }

    const oldAvatarPublicId = await extractPublicId(req.user?.avatar)
    await cloudinary.uploader.destroy(oldAvatarPublicId)

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select("-password-refreshToken")

    res
        .status(200)
        .json(new ApiResponse(200, user, "avatar updated successully"))
})

const updateCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath)
        throw new ApiError("Coverimage is missing", 400)

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage?.url) {
        throw new ApiError("Error while uploading coverImage")
    }

    const oldCoverImagePublicId = extractPublicId(req.user?.coverImage)
    if (oldCoverImagePublicId)
        await cloudinary.uploader.destroy(oldCoverImagePublicId)

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    ).select("-password-refreshToken")

    res
        .status(200)
        .json(new ApiResponse(200, user, "coverImage updated successully"))
})


const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        { new: true }

    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"))
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params

    if (!username?.trim()) {
        throw new ApiError("username is missing")
    }

    //aggerate pipelines : article yet to be written
    const channel = await User.aggregate(
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscription",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscription",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscriberCount: {
                    $size: $subscribers
                },
                channelSubscribedToCount: {
                    $size: $subscribedTo
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, $subscribers.subscriber] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscriberCount: 1,
                channelSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    )

    if (!channel?.length) {
        throw new ApiError("channel does not exist", 404)
    }

    res
        .status(200)
        .json(new ApiResponse(200, channel[0], "User channel fetched successfully"))
})

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = User.aggregate(
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from :"user",
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
                        $addFields:{
                            owner:{
                                $first : $owner
                            }
                        }
                    }
                ]
            }
        }
    )

    res
    .status(200)
    .json(new ApiResponse(200,user[0].watchHistory,"Watch History Fetched Successfully"))
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refereshAccessToken,
    updateAccountDetails,
    updateAvatar,
    updateCoverImage,
    getCurrentUser,
    changeCurrentPassword,
    getUserChannelProfile,
    getWatchHistory
};
