import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import CircularProgress from '@mui/joy/CircularProgress';
import Typography from '@mui/joy/Typography';
import { LinearProgress } from '@mui/material';

const GetUserImg = async () => {
	try {
		const response = await fetch(
			`http://localhost:8002/user/avatar/1/`,
			{
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			}
		);

		if (response.ok) {
			const data = await response.json();
			console.log("ActiveTask:", data);
		} else {
			const errorData = await response.json();
			console.error("Errore ActiveTask:", errorData);
		}
	} catch (error) {
		console.error("Errore ActiveTask:", error);
	}
};

export default function UserAvatar({ level }) {
	console.log("level", level);
  const progressValue = Math.min(Math.max(level, 0), 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <Avatar alt="User Avatar" src={GetUserImg()} style={{ marginBottom: '10px' }} />
      <LinearProgress variant="determinate" value={progressValue} style={{ width: '100%', marginBottom: '10px' }} />
      <Typography>
        Exp: {progressValue}
      </Typography>
    </div>
  );
}