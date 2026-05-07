import { FunctionComponent, type CSSProperties } from "react";
import { Box } from "@mui/material";
import FrameComponent11 from "./FrameComponent11";
import styles from "./Component6.module.css";

export type Component6Type = {
  className?: string;
  property1?: CSSProperties["property1"];
  size?: CSSProperties["size"];
  status1?: CSSProperties["status"];
  type?: CSSProperties["type"];
};

const Component6: FunctionComponent<Component6Type> = ({
  className = "",
  property1,
  size,
  status1,
  type,
}) => {
  return (
    <Box className={[styles.component7, className].join(" ")}>
      <Box className={styles.component7Child} />
      <FrameComponent11 size="Small" status1="Default" type="Initials" />
    </Box>
  );
};

export default Component6;
