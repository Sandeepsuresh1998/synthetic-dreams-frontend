import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';

export default function ButtonAppBar() {
  return (
    <Box sx={{ flexGrow: 1}}>
      <AppBar position="static" sx={{alignItems: "flex-end", backgroundColor: "transparent", backgroundImage: "none"}}>
        <Toolbar>
          <Link href="https://opensea.io/collection/synthetic-dreams-v2-1">
            <Button>Opensea</Button>
          </Link>
          <Link href="https://twitter.com/sandeep98suresh">
            <Button>Twitter</Button>
          </Link>
          <Link href="https://etherscan.io/address/0xdc734177194bf36c38709e50006a631abdf9233b#code">
            <Button>Etherscan</Button>
          </Link>
        </Toolbar>
      </AppBar>
    </Box>
  );
}