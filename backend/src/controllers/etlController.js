/**
 * ETL Controller
 * Triggers the Python ETL pipeline and returns run history.
 */
const { pool }   = require('../config/db');
const { spawn }  = require('child_process');
const path       = require('path');
const fs         = require('fs');

const ETL_SCRIPT = path.resolve(__dirname, '../../../../etl/etl_pipeline.py');
const DATASET_DIR = path.resolve(__dirname, '../../../../datasets');

// ── GET /api/etl/runs ─────────────────────────────────────────
// Returns last N ETL run records
exports.getEtlRuns = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const [rows] = await pool.execute(
      `SELECT id, run_at, source_file, records_extracted, records_transformed,
              records_loaded, status, error_message, duration_seconds
       FROM etl_runs
       ORDER BY run_at DESC
       LIMIT ?`,
      [limit]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getEtlRuns error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /api/etl/datasets ─────────────────────────────────────
// Lists available CSV files in the datasets folder
exports.getDatasets = async (req, res) => {
  try {
    if (!fs.existsSync(DATASET_DIR)) {
      return res.json({ success: true, data: [] });
    }
    const files = fs.readdirSync(DATASET_DIR)
      .filter(f => f.endsWith('.csv') || f.endsWith('.json'))
      .map(f => ({
        name: f,
        path: path.join(DATASET_DIR, f),
        size: fs.statSync(path.join(DATASET_DIR, f)).size,
        modified: fs.statSync(path.join(DATASET_DIR, f)).mtime,
      }));
    res.json({ success: true, data: files });
  } catch (err) {
    console.error('getDatasets error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /api/etl/run ─────────────────────────────────────────
// Spawns the Python ETL pipeline and streams output
// Body: { filename: "complaints_dataset.csv" }  (optional — defaults to first CSV found)
exports.runEtl = async (req, res) => {
  try {
    const { filename } = req.body;

    // Resolve dataset file
    let filePath;
    if (filename) {
      filePath = path.join(DATASET_DIR, filename);
      if (!fs.existsSync(filePath)) {
        return res.status(400).json({ success: false, message: `File not found: ${filename}` });
      }
    } else {
      // Auto-pick first CSV
      const files = fs.existsSync(DATASET_DIR)
        ? fs.readdirSync(DATASET_DIR).filter(f => f.endsWith('.csv'))
        : [];
      if (!files.length) {
        return res.status(400).json({ success: false, message: 'No dataset CSV found in /datasets folder' });
      }
      filePath = path.join(DATASET_DIR, files[0]);
    }

    if (!fs.existsSync(ETL_SCRIPT)) {
      return res.status(500).json({ success: false, message: `ETL script not found at ${ETL_SCRIPT}` });
    }

    // Run the Python script
    const startTime = Date.now();
    const proc = spawn('python', [ETL_SCRIPT, '--file', filePath], {
      env: { ...process.env },
      cwd: path.dirname(ETL_SCRIPT),
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });

    proc.on('close', async (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(3);

      // Fetch the latest etl_run record created by the script
      const [runs] = await pool.execute(
        'SELECT * FROM etl_runs ORDER BY run_at DESC LIMIT 1'
      );
      const latestRun = runs[0] || null;

      if (code === 0) {
        res.json({
          success: true,
          message: 'ETL pipeline completed successfully',
          data: {
            exitCode: code,
            duration,
            output: stdout.slice(-3000),   // last 3000 chars
            run: latestRun,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'ETL pipeline failed',
          data: {
            exitCode: code,
            duration,
            output: stdout.slice(-2000),
            error: stderr.slice(-2000),
            run: latestRun,
          },
        });
      }
    });

    proc.on('error', (err) => {
      res.status(500).json({
        success: false,
        message: `Failed to start ETL process: ${err.message}`,
      });
    });

  } catch (err) {
    console.error('runEtl error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
