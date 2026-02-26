import multer from "multer";
import path from "path";

const storage = multer.memoryStorage();


 const multerUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 ,
  },

});

const singleAvatar = multerUpload.single("avatar");
const attachment = multerUpload.array("files");
export {singleAvatar , attachment}