import { IconButton } from '@mui/material';
import { styled } from '@mui/material/styles';

const MenuButton = styled(IconButton)(({ theme }) => ({
  color: "#ffffff",
  marginRight: theme.spacing(1)
}));

export default MenuButton;