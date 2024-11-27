import * as React from "react";
import Button from "@mui/joy/Button";
import Card from "@mui/joy/Card";
import CardContent from "@mui/joy/CardContent";
import CardActions from "@mui/joy/CardActions";
import CircularProgress from "@mui/joy/CircularProgress";
import Typography from "@mui/joy/Typography";
import SvgIcon from "@mui/joy/SvgIcon";
import Box from "@mui/material/Box";
import TaskActive from "../TaskActive/TaskActive";
import TaskInfo from "../TaskInfo/TaskInfo";

export default function CardInvertedColors({ task, handleJoinTask }) {
  const [open, setOpen] = React.useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <React.Fragment>
      <Card
        variant="solid"
        color="primary"
        invertedColors
        sx={{
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
          width: "100%",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <CircularProgress size="lg" determinate value={0}>
          <SvgIcon>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
              />
            </svg>
          </SvgIcon>
        </CircularProgress>
        <CardContent sx={{ flex: 2, display: "flex", justifyContent: "center" }}>
          <Typography level="h1">{task.name.toUpperCase()}</Typography>
        </CardContent>
        <CardActions
          sx={{
            display: "flex",
            justifyContent: "center",
            flexDirection: "column",
            padding: "0",
          }}
        >
          <Button variant="soft" size="sm" onClick={() => handleJoinTask(task.id)}>
            +
          </Button>
          <Button variant="soft" size="sm" onClick={handleClickOpen}>
            ?
          </Button>
        </CardActions>
      </Card>
      <TaskInfo task={task} open={open} onClose={handleClose} />
    </React.Fragment>
  );
}