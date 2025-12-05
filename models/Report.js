const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: String,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    proof: {
        type: String,
        default: ''
    },
    server: {
        type: String,
        default: 'Not specified'
    },
    reportedBy: {
        type: String,
        required: true
    },
    reportedAt: {
        type: Date,
        default: Date.now
    },
    messageId: {
        type: String,
        default: null
    },
    unblacklisted: {
        type: Boolean,
        default: false
    },
    approved: {
        type: Boolean,
        default: false
    },
    edits: [{
        editId: String,
        previousReason: String,
        previousProof: String,
        newReason: String,
        newProof: String,
        editedBy: String,
        editedAt: Date
    }]
}, {
    timestamps: true
});

// Index for better performance
ReportSchema.index({ userId: 1, unblacklisted: 1 });
ReportSchema.index({ reportedAt: -1 });

module.exports = mongoose.model('Report', ReportSchema);
