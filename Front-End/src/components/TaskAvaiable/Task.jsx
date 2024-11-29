import "./Task.css";
import React, { useEffect, useState } from "react";
import { getCookie } from "../Cookie.jsx";
import Box from "@mui/material/Box";
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import Typography from '@mui/joy/Typography';
import Sheet from '@mui/joy/Sheet';
import Button from '@mui/joy/Button';
import CircularProgress from '@mui/joy/CircularProgress';

const joinTasks = async (task_id, user_id) => {
  try {
    const response = await fetch(`http://localhost:8002/task/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken"),
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ task: task_id, user: user_id }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("Joined chat:", data);
    } else {
      const errorData = await response.json();
      console.error("Errore nella risposta del server:", errorData);
    }
  } catch (error) {
    console.error("Errore nella richiesta:", error);
  }
};

export default function TaskAvaiable(task) {
  const user_id = localStorage.getItem("user_id");

  const handleJoinTask = (task_id) => {
    joinTasks(task_id, user_id);
  };

  return (
    <Box>
      <Card orientation="horizontal">
        <CardContent>
          <Typography sx={{ fontSize: 'xl', fontWeight: 'lg' }}>
            {task.task.name} {task.task.category}
          </Typography>
          <Typography
            level="body-sm"
            textColor="text.tertiary"
            sx={{ fontWeight: 'lg' }}
          >
            {task.task.description}
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
          </Sheet>
          <Box sx={{ display: 'flex', gap: 1.5, '& > button': { flex: 1 } }}>
            <Button variant="outlined" color="neutral" onClick={() => handleJoinTask(task.task.id)}>
              Iscriviti
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}