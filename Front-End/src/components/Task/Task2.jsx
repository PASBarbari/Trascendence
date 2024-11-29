import * as React from 'react';
import AspectRatio from '@mui/joy/AspectRatio';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import Typography from '@mui/joy/Typography';
import Sheet from '@mui/joy/Sheet';
import CircularProgress from '@mui/joy/CircularProgress';
import { getCookie } from "../Cookie.jsx";

export default function Task2({ id, task, onCancel }) {
  const [progress, setProgress] = React.useState(task.rate);

  const handleCancel = () => {
    if (onCancel) {
      onCancel(id);
    }
  };

  const updateProgress = async (newProgress) => {
    try {
      const response = await fetch(`http://localhost:8002/task/progress/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ rate: newProgress }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Errore nella risposta del server:", errorData);
      }
    } catch (error) {
      console.error("Errore nella richiesta:", error);
    }
  };

  const handleProgressClick = () => {
    setProgress((prevProgress) => {
      const newProgress = Math.min(prevProgress + 10, 100);
      updateProgress(newProgress);
      return newProgress;
    });
  };

  return (
    <Box>
      <Card orientation="horizontal">
        <CardContent>
          <CircularProgress
            variant="solid"
            value={progress}
            onClick={handleProgressClick}
			determinate
            sx={{ cursor: 'pointer' }}
          />
          <Typography sx={{ fontSize: 'xl', fontWeight: 'lg' }}>
            {task.task.name} {task.task.category}
          </Typography>
          <Typography
            level="body-sm"
            textColor="text.tertiary"
            sx={{ fontWeight: 'lg' }}
          >
          </Typography>
          <Sheet
            sx={{
              bgcolor: 'background.level1',
              borderRadius: 'sm',
              p: 1.5,
              my: 1.5,
              display: 'flex',
              gap: 2,
              '& > div': { flex: 1 },
            }}
          >
            <div>
              <Typography level="body-xs" sx={{ fontWeight: 'lg' }}>
                Time remaining
              </Typography>
              <Typography sx={{ fontWeight: 'lg' }}>{task.task.duration[0]} days</Typography>
            </div>
            <div>
              <Typography level="body-xs" sx={{ fontWeight: 'lg' }}>
                EXP
              </Typography>
              <Typography sx={{ fontWeight: 'lg' }}>{task.task.exp}</Typography>
            </div>
            <div>
              <Typography level="body-xs" sx={{ fontWeight: 'lg' }}>
                Progress
              </Typography>
              <Typography sx={{ fontWeight: 'lg' }}>{progress}</Typography>
            </div>
          </Sheet>
          <Box sx={{ display: 'flex', gap: 1.5, '& > button': { flex: 1 } }}>
            <Button variant="outlined" color="neutral" onClick={handleCancel}>
              Cancella
            </Button>
            <Button variant="solid" color="primary">
              Completa
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}