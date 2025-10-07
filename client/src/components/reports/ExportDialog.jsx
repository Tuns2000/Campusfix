import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Button, 
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
  Typography,
  FormControlLabel,
  RadioGroup,
  Radio
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { ru } from 'date-fns/locale';
import { reportsApi } from '../../lib/api';

const ExportDialog = ({ open, onClose }) => {
  // Состояние параметров экспорта
  const [reportType, setReportType] = useState('defects');
  const [fileFormat, setFileFormat] = useState('excel');
  const [filters, setFilters] = useState({
    project: '',
    status: '',
    priority: '',
    startDate: null,
    endDate: null,
  });

  const { projects } = useSelector(state => state.projects);

  // Обработчики изменения значений
  const handleReportTypeChange = (event) => {
    setReportType(event.target.value);
  };

  const handleFormatChange = (event) => {
    setFileFormat(event.target.value);
  };

  const handleFilterChange = (event) => {
    setFilters({
      ...filters,
      [event.target.name]: event.target.value
    });
  };

  const handleDateChange = (name, date) => {
    setFilters({
      ...filters,
      [name]: date
    });
  };

  // Функция экспорта
  const handleExport = () => {
    if (reportType === 'defects') {
      const exportFilters = {
        ...filters,
        startDate: filters.startDate ? filters.startDate.toISOString().split('T')[0] : undefined,
        endDate: filters.endDate ? filters.endDate.toISOString().split('T')[0] : undefined
      };
      reportsApi.exportDefects(fileFormat, exportFilters);
    } else {
      reportsApi.exportProjects(fileFormat);
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Экспорт отчета</DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="subtitle1">Тип отчета</Typography>
            <RadioGroup row value={reportType} onChange={handleReportTypeChange}>
              <FormControlLabel value="defects" control={<Radio />} label="Дефекты" />
              <FormControlLabel value="projects" control={<Radio />} label="Проекты" />
            </RadioGroup>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle1">Формат файла</Typography>
            <RadioGroup row value={fileFormat} onChange={handleFormatChange}>
              <FormControlLabel value="excel" control={<Radio />} label="Excel (.xlsx)" />
              <FormControlLabel value="csv" control={<Radio />} label="CSV" />
            </RadioGroup>
          </Grid>

          {reportType === 'defects' && (
            <>
              <Grid item xs={12}>
                <Typography variant="subtitle1">Параметры фильтрации</Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Проект</InputLabel>
                  <Select
                    name="project"
                    value={filters.project}
                    onChange={handleFilterChange}
                    label="Проект"
                  >
                    <MenuItem value="">Все проекты</MenuItem>
                    {projects && projects.map(project => (
                      <MenuItem key={project.id} value={project.id}>
                        {project.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Статус</InputLabel>
                  <Select
                    name="status"
                    value={filters.status}
                    onChange={handleFilterChange}
                    label="Статус"
                  >
                    <MenuItem value="">Все статусы</MenuItem>
                    <MenuItem value="новый">Новый</MenuItem>
                    <MenuItem value="подтвержден">Подтвержден</MenuItem>
                    <MenuItem value="в работе">В работе</MenuItem>
                    <MenuItem value="исправлен">Исправлен</MenuItem>
                    <MenuItem value="проверен">Проверен</MenuItem>
                    <MenuItem value="закрыт">Закрыт</MenuItem>
                    <MenuItem value="отклонен">Отклонен</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Приоритет</InputLabel>
                  <Select
                    name="priority"
                    value={filters.priority}
                    onChange={handleFilterChange}
                    label="Приоритет"
                  >
                    <MenuItem value="">Все приоритеты</MenuItem>
                    <MenuItem value="низкий">Низкий</MenuItem>
                    <MenuItem value="средний">Средний</MenuItem>
                    <MenuItem value="высокий">Высокий</MenuItem>
                    <MenuItem value="критический">Критический</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle1">Период</Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
                  <DatePicker 
                    label="С даты"
                    value={filters.startDate}
                    onChange={(date) => handleDateChange('startDate', date)}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </LocalizationProvider>
              </Grid>

              <Grid item xs={12} md={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
                  <DatePicker 
                    label="По дату"
                    value={filters.endDate}
                    onChange={(date) => handleDateChange('endDate', date)}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </LocalizationProvider>
              </Grid>
            </>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button onClick={handleExport} variant="contained" color="primary">
          Экспортировать
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportDialog;