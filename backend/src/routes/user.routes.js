import { Router } from "express";
import { 
    registerUser,
    loginUser, 
    logoutUser,
    getCurrentUser,
    refereshAccessToken,
    changeCurrentPassword,
    updateAccountDetails,
    updateAvatar,
    updateCoverImage,
    getUserChannelProfile,
    getWatchHistory,

} from '../controllers/user.controller.js'
import { upload } from '../middlewares/multer.middleware.js'
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
)

router.route("/login").post(loginUser)
router.route("refresh-token").post(refereshAccessToken)

//secured routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/current-user").get(verifyJWT,getCurrentUser);
router.route("/change-password").patch(verifyJWT,changeCurrentPassword)
router.route("/update-account").patch(verifyJWT,updateAccountDetails)

router.route("/avatar").patch(verifyJWT,upload.single("avatar"),updateAvatar);
router.route("/cover-image").patch(verifyJWT,upload.single("coverImage"),updateCoverImage);

router.route("/c:username").get(verifyJWT,getUserChannelProfile);
router.route("/history").get(verifyJWT,getWatchHistory);

export default router;