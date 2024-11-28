import * as React from 'react';
import AspectRatio from '@mui/joy/AspectRatio';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import Typography from '@mui/joy/Typography';
import Sheet from '@mui/joy/Sheet';
import CircularProgress from '@mui/joy/CircularProgress';

export default function UserCard({id, task}) {
  return (
    <Box>
      <Card
        orientation="horizontal"
        sx={{
          flexWrap: 'wrap',
          [`& > *`]: {
            '--stack-point': '500px',
            minWidth:
              'clamp(0px, (calc(var(--stack-point) - 2 * var(--Card-padding) - 2 * var(--variant-borderWidth, 0px)) + 1px - 100%) * 999, 100%)',
          },
          // make the card resizable for demo
        }}
      >
        <CardContent>
		<CircularProgress variant="solid" determinate="{task.progress}"/>
          <Typography sx={{ fontSize: 'xl', fontWeight: 'lg' }}>
            {task.task.name}
          </Typography>
          <Typography
            level="body-sm"
            textColor="text.tertiary"
            sx={{ fontWeight: 'lg' }}
			>
            Category: {task.task.category}
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
                Time remaing
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
                Rate
              </Typography>
              <Typography sx={{ fontWeight: 'lg' }}>{task.rate}</Typography>
            </div>
          </Sheet>
          <Box sx={{ display: 'flex', gap: 1.5, '& > button': { flex: 1 } }}>
            <Button variant="outlined" color="neutral">
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
