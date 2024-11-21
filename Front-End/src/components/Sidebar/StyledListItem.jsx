import { ListItem } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledListItem = styled(ListItem)(({ theme }) => ({
  marginBottom: theme.spacing(0.5),
  "&:hover": {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: theme.spacing(1)
  },
  padding: theme.spacing(1.5),
  transition: "all 0.3s ease"
}));

export default StyledListItem;