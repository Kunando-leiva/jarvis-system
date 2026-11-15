import express from 'express';
import storyService, { STATUSES } from '../services/instagramStoryService.js';

const router = express.Router();

router.get('/instagram/stories', (req, res) => {
  try {
    const stories = storyService.list();
    res.json({ success: true, total: stories.length, stories, statuses: STATUSES });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
});

router.post('/instagram/stories', async (req, res) => {
  try {
    const story = await storyService.create(req.body);
    res.status(201).json({
      success: true,
      story,
      notice: story.linkUrl
        ? 'Historia programada. Al llegar la hora, JARVIS solicitará completar manualmente el sticker de enlace desde Instagram.'
        : 'Historia programada para publicación mediante Instagram Graph API.'
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
});

router.post('/instagram/stories/:id/manual-complete', (req, res) => {
  try {
    const story = storyService.markManualCompleted(req.params.id, req.body?.instagramMediaId || null);
    res.json({ success: true, story });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
});

router.post('/instagram/stories/process-due', async (req, res) => {
  try {
    await storyService.processDue();
    res.json({ success: true, stories: storyService.list() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

storyService.startScheduler();

export default router;
