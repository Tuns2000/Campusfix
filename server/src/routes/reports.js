const express = require('express');
const router = express.Router();
const db = require('../services/db');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Получение статистики по дефектам
router.get('/stats', async (req, res, next) => {
  try {
    // Статистика по статусам
    const statusStats = await db.query(`
      SELECT status, COUNT(*) as count 
      FROM defects 
      GROUP BY status 
      ORDER BY count DESC
    `);
    
    // Статистика по приоритетам
    const priorityStats = await db.query(`
      SELECT priority, COUNT(*) as count 
      FROM defects 
      GROUP BY priority 
      ORDER BY count DESC
    `);
    
    // Статистика по проектам
    const projectStats = await db.query(`
      SELECT p.id, p.name, COUNT(d.id) as defects_count 
      FROM projects p 
      LEFT JOIN defects d ON p.id = d.project_id 
      GROUP BY p.id, p.name 
      ORDER BY defects_count DESC
    `);
    
    res.json({
      success: true,
      stats: {
        byStatus: statusStats.rows,
        byPriority: priorityStats.rows,
        byProject: projectStats.rows
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;