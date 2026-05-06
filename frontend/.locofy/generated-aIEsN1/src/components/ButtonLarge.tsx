import { FunctionComponent, type CSSProperties } from "react";
import { Box } from "@mui/material";
import SparkleIconG from "./SparkleIconG";
import styles from "./ButtonLarge.module.css";

export type ButtonLargeType = {
  className?: string;
  rightIcon?: boolean;
  leftIcon?: boolean;
  text?: string;

  /** Variant props */
  color?: CSSProperties["color"];
  state?: CSSProperties["state"];
  type?: CSSProperties["type"];
};

const ButtonLarge: FunctionComponent<ButtonLargeType> = ({
  className = "",
  color = "Blue",
  state = "Default",
  type = "Primary",
  rightIcon = false,
  leftIcon = true,
  text,
}) => {
  return (
    <Box
      className={[styles.buttonLarge, className].join(" ")}
      data-color={color}
      data-state={state}
      data-type={type}
    >
      {!!leftIcon && (
        <SparkleIconG
          color="Blue"
          state="Motion"
          type="AI"
          showSparkleIconG
          component1="/Component-1.svg"
        />
      )}
      <Box className={styles.buttonContent}>
        <div className={styles.large}>{text}</div>
      </Box>
      {!!rightIcon && (
        <SparkleIconG
          color="Blue"
          state="Motion"
          type="AI"
          showSparkleIconG={false}
          component1="/Component-1.svg"
        />
      )}
    </Box>
  );
};

export default ButtonLarge;
