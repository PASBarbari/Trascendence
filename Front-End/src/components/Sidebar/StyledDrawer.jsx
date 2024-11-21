import { Drawer } from '@mui/material';
import { styled } from '@mui/material/styles';

const drawerWidth = 260;

const StyledDrawer = styled(Drawer)(({ theme, open }) => ({
  width: open ? drawerWidth : theme.spacing(7),
  flexShrink: 0,
  whiteSpace: "nowrap",
  "& .MuiDrawer-paper": {
    width: open ? drawerWidth : theme.spacing(7),
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen
    }),
    overflowX: "hidden",
    backgroundColor: "#1a237e",
    color: "#ffffff"
  }
}));

export default StyledDrawer;