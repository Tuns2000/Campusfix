const db = require('../services/db');

const fixStatusConstraint = async () => {
  try {
    // Получаем информацию о текущем ограничении
    console.log('Проверка ограничений таблицы projects...');
    
    const constraintInfo = await db.query(`
      SELECT conname, pg_get_constraintdef(c.oid) as constraint_def
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      JOIN pg_class cl ON cl.oid = c.conrelid
      WHERE cl.relname = 'projects' AND contype = 'c' AND conname = 'projects_status_check';
    `);
    
    if (constraintInfo.rows.length > 0) {
      console.log('Найдено ограничение:', constraintInfo.rows[0].constraint_def);
      
      // Удаляем текущее ограничение
      await db.query(`ALTER TABLE projects DROP CONSTRAINT projects_status_check;`);
      console.log('Существующее ограничение удалено');
      
      // Создаем новое ограничение с добавлением значения 'planned'
      await db.query(`
        ALTER TABLE projects 
        ADD CONSTRAINT projects_status_check 
        CHECK (status IN ('active', 'completed', 'pending', 'cancelled', 'planned', 'in_progress'));
      `);
      console.log('Создано новое ограничение с добавлением значения "planned"');
    } else {
      // Если ограничение не найдено, создаем его
      await db.query(`
        ALTER TABLE projects 
        ADD CONSTRAINT projects_status_check 
        CHECK (status IN ('active', 'completed', 'pending', 'cancelled', 'planned', 'in_progress'));
      `);
      console.log('Создано новое ограничение для столбца status');
    }
    
    return true;
  } catch (error) {
    console.error('Ошибка при исправлении ограничения status:', error);
    return false;
  }
};

module.exports = { fixStatusConstraint };