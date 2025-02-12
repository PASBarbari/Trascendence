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
        <CardContent sx={{ flex: 2, display: "flex", justifyContent: "center" }}>
          <Typography level="h4">{task.name.toUpperCase()}</Typography>
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