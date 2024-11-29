import express from 'express';
import multer from 'multer'; // Middleware for handling file uploads



const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/w9'); // Directory to store W-9 files
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${uniqueSuffix}-${file.originalname}`);
    }
});

const upload = multer({ storage });

// Route to handle W-9 uploads
router.post('/upload-w9', upload.single('w9File'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    // File successfully uploaded
    res.status(200).json({
        message: 'W-9 uploaded successfully',
        filePath: req.file.path
    });
});

export default router;
