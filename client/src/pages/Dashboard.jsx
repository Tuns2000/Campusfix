import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Avatar,
  Divider,
  CircularProgress,
  Chip,
  useTheme,
  alpha
} from '@mui/material';
import {
  Business as ProjectIcon,
  BugReport as DefectIcon,
  Assignment as TaskIcon,
  BarChart as ChartIcon,
  ArrowUpward as TrendUpIcon,
  ArrowDownward as TrendDownIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

// Имитация данных
const activityData = [
  { name: 'Создан дефект #124', time: '15 мин назад', user: 'Инженер А.', avatar: null },
  { name: 'Закрыт дефект #110', time: '2 часа назад', user: 'Инженер Б.', avatar: null },
  { name: 'Создан проект "Ремонт общежития №3"', time: '5 часов назад', user: 'Менеджер В.', avatar: null },
];

const Dashboard = () => {
  const theme = useTheme();
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    projects: 5,
    openDefects: 15,
    closedDefects: 23,
    myAssignedDefects: 4
  });
  const [loading, setLoading] = useState(true);

  // Данные для графиков
  const defectData = [
    { name: 'Открытые', value: stats.openDefects, color: theme.palette.error.main },
    { name: 'Закрытые', value: stats.closedDefects, color: theme.palette.success.main },
  ];

  // Градиенты для карточек
  const gradients = {
    project: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.9)} 0%, ${alpha(theme.palette.primary.dark, 0.8)} 100%)`,
    defect: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.9)} 0%, ${alpha(theme.palette.error.dark, 0.8)} 100%)`,
    closed: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.9)} 0%, ${alpha(theme.palette.success.dark, 0.8)} 100%)`,
    assigned: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.9)} 0%, ${alpha(theme.palette.warning.dark, 0.8)} 100%)`
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // В реальном приложении здесь будут запросы к API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setStats({
          projects: 5,
          openDefects: 15,
          closedDefects: 23,
          myAssignedDefects: 4
        });
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user.id]);

  const navigateTo = (path) => {
    navigate(path);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Приветствие и дата */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ 
          mb: 4,
          background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.15)} 0%, rgba(255,255,255,0) 100%)`,
          p: 3,
          borderRadius: 2,
          borderLeft: `4px solid ${theme.palette.primary.main}`
        }}>
          <Grid container alignItems="center" spacing={2}>
            <Grid item>
              <Avatar 
                sx={{ 
                  width: 60, 
                  height: 60,
                  bgcolor: theme.palette.primary.main,
                  boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.2)}`
                }}
              >
                {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
              </Avatar>
            </Grid>
            <Grid item xs>
              <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
                Добро пожаловать, {user.firstName} {user.lastName}!
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </motion.div>

      {/* Статистические карточки в новом дизайне */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Проекты */}
        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
          >
            <Card 
              sx={{ 
                borderRadius: 3,
                overflow: 'hidden',
                position: 'relative',
                height: 180,
                cursor: 'pointer',
              }}
              onClick={() => navigateTo('/projects')}
            >
              <Box sx={{ 
                height: '100%',
                background: gradients.project,
                color: 'white',
                p: 3,
              }}>
                <Box sx={{ 
                  position: 'absolute', 
                  top: 20, 
                  right: 20,
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  bgcolor: 'rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ProjectIcon fontSize="large" />
                </Box>
                
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                  <Typography variant="overline" fontWeight="bold" fontSize="0.75rem" sx={{ opacity: 0.8 }}>
                    АКТИВНЫЕ ПРОЕКТЫ
                  </Typography>
                  <Typography variant="h2" fontWeight="bold" sx={{ my: 1 }}>
                    {stats.projects}
                  </Typography>
                  <Chip 
                    label="Просмотреть все" 
                    size="small" 
                    sx={{ 
                      bgcolor: 'rgba(255,255,255,0.2)', 
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.3)'
                      } 
                    }} 
                  />
                </Box>

                <Box sx={{ 
                  position: 'absolute',
                  right: -20,
                  bottom: -20,
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  bgcolor: 'rgba(255,255,255,0.05)',
                  zIndex: 0
                }} />
              </Box>
            </Card>
          </motion.div>
        </Grid>
        
        {/* Открытые дефекты */}
        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
          >
            <Card 
              sx={{ 
                borderRadius: 3,
                overflow: 'hidden',
                position: 'relative',
                height: 180,
                cursor: 'pointer',
              }}
              onClick={() => navigateTo('/defects?status=open')}
            >
              <Box sx={{ 
                height: '100%',
                background: gradients.defect,
                color: 'white',
                p: 3
              }}>
                <Box sx={{ 
                  position: 'absolute', 
                  top: 20, 
                  right: 20,
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  bgcolor: 'rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <DefectIcon fontSize="large" />
                </Box>
                
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                  <Typography variant="overline" fontWeight="bold" fontSize="0.75rem" sx={{ opacity: 0.8 }}>
                    ОТКРЫТЫЕ ДЕФЕКТЫ
                  </Typography>
                  <Typography variant="h2" fontWeight="bold" sx={{ my: 1 }}>
                    {stats.openDefects}
                  </Typography>
                  <Chip 
                    icon={<TrendUpIcon fontSize="small" />}
                    label="+2 за неделю" 
                    size="small" 
                    sx={{ 
                      bgcolor: 'rgba(255,255,255,0.2)', 
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.3)'
                      } 
                    }} 
                  />
                </Box>

                <Box sx={{ 
                  position: 'absolute',
                  right: -20,
                  bottom: -20,
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  bgcolor: 'rgba(255,255,255,0.05)',
                  zIndex: 0
                }} />
              </Box>
            </Card>
          </motion.div>
        </Grid>
        
        {/* Закрытые дефекты */}
        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
          >
            <Card 
              sx={{ 
                borderRadius: 3,
                overflow: 'hidden',
                position: 'relative',
                height: 180,
                cursor: 'pointer',
              }}
              onClick={() => navigateTo('/defects?status=closed')}
            >
              <Box sx={{ 
                height: '100%',
                background: gradients.closed,
                color: 'white',
                p: 3
              }}>
                <Box sx={{ 
                  position: 'absolute', 
                  top: 20, 
                  right: 20,
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  bgcolor: 'rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <TaskIcon fontSize="large" />
                </Box>
                
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                  <Typography variant="overline" fontWeight="bold" fontSize="0.75rem" sx={{ opacity: 0.8 }}>
                    ЗАКРЫТЫЕ ДЕФЕКТЫ
                  </Typography>
                  <Typography variant="h2" fontWeight="bold" sx={{ my: 1 }}>
                    {stats.closedDefects}
                  </Typography>
                  <Chip 
                    icon={<TrendUpIcon fontSize="small" />}
                    label="+5 за неделю" 
                    size="small" 
                    sx={{ 
                      bgcolor: 'rgba(255,255,255,0.2)', 
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.3)'
                      } 
                    }} 
                  />
                </Box>

                <Box sx={{ 
                  position: 'absolute',
                  right: -20,
                  bottom: -20,
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  bgcolor: 'rgba(255,255,255,0.05)',
                  zIndex: 0
                }} />
              </Box>
            </Card>
          </motion.div>
        </Grid>
        
        {/* Назначенные мне */}
        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
          >
            <Card 
              sx={{ 
                borderRadius: 3,
                overflow: 'hidden',
                position: 'relative',
                height: 180,
                cursor: 'pointer',
              }}
              onClick={() => navigateTo(`/defects?assignedTo=${user.id}`)}
            >
              <Box sx={{ 
                height: '100%',
                background: gradients.assigned,
                color: 'white',
                p: 3
              }}>
                <Box sx={{ 
                  position: 'absolute', 
                  top: 20, 
                  right: 20,
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  bgcolor: 'rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <PersonIcon fontSize="large" />
                </Box>
                
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                  <Typography variant="overline" fontWeight="bold" fontSize="0.75rem" sx={{ opacity: 0.8 }}>
                    НАЗНАЧЕНО МНЕ
                  </Typography>
                  <Typography variant="h2" fontWeight="bold" sx={{ my: 1 }}>
                    {stats.myAssignedDefects}
                  </Typography>
                  <Chip 
                    label="Срочных: 1" 
                    size="small" 
                    sx={{ 
                      bgcolor: 'rgba(255,255,255,0.2)', 
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.3)'
                      } 
                    }} 
                  />
                </Box>

                <Box sx={{ 
                  position: 'absolute',
                  right: -20,
                  bottom: -20,
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  bgcolor: 'rgba(255,255,255,0.05)',
                  zIndex: 0
                }} />
              </Box>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Соотношение дефектов - круговая диаграмма */}
        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Card sx={{ p: 3, borderRadius: 3, height: 380 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Состояние дефектов
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={7}>
                  <Box sx={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={defectData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          animationBegin={0}
                          animationDuration={1500}
                        >
                          {defectData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </Grid>
                <Grid item xs={5}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: 2 }}>
                    {defectData.map((entry, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ width: 16, height: 16, borderRadius: 1, bgcolor: entry.color, mr: 1 }} />
                        <Typography variant="body2">{entry.name}: <b>{entry.value}</b></Typography>
                      </Box>
                    ))}
                    
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        Всего дефектов: {stats.openDefects + stats.closedDefects}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Процент решения: {Math.round((stats.closedDefects / (stats.openDefects + stats.closedDefects)) * 100)}%
                      </Typography>
                    </Box>
                    
                    <Button 
                      variant="outlined" 
                      color="primary"
                      size="small"
                      sx={{ mt: 2, alignSelf: 'flex-start' }}
                      onClick={() => navigateTo('/defects')}
                    >
                      Все дефекты
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Card>
          </motion.div>
        </Grid>
        
        {/* Последние активности */}
        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Card sx={{ p: 3, borderRadius: 3, height: 380 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Последние активности
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {activityData.length > 0 ? (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 2,
                  maxHeight: 280,
                  overflow: 'auto',
                  pr: 1
                }}>
                  {activityData.map((activity, index) => (
                    <Box 
                      key={index}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.08),
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Avatar 
                          sx={{ 
                            width: 36, 
                            height: 36, 
                            mr: 2,
                            bgcolor: theme.palette.secondary.main 
                          }}
                        >
                          {activity.user.split(' ')[0][0]}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {activity.name}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                            <TimeIcon sx={{ fontSize: 14, mr: 0.5, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">
                              {activity.time} · {activity.user}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                  <Typography variant="body2" color="text.secondary" align="center">
                    Пока нет активностей для отображения.
                    <br />
                    Действия пользователей будут появляться здесь.
                  </Typography>
                </Box>
              )}
            </Card>
          </motion.div>
        </Grid>
        
        {/* Быстрые действия */}
        <Grid item xs={12}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <Card 
              sx={{ 
                p: 3, 
                borderRadius: 3,
                background: `linear-gradient(90deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.default, 0.95)} 100%)`,
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              }}
            >
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Быстрые действия
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<DefectIcon />}
                    sx={{ 
                      px: 3,
                      borderRadius: 2,
                      backgroundImage: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                      boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.4)}`
                    }}
                    onClick={() => navigateTo('/defects/new')}
                  >
                    Создать дефект
                  </Button>
                </Grid>
                <Grid item>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<ChartIcon />}
                    sx={{ px: 3, borderRadius: 2 }}
                    onClick={() => navigateTo('/reports')}
                  >
                    Отчеты
                  </Button>
                </Grid>
              </Grid>
            </Card>
          </motion.div>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;