import { FunctionComponent, type CSSProperties } from "react";
import { Box } from "@mui/material";
import styles from "./ArrowUpCircle.module.css";

export type ArrowUpCircleType = {
  className?: string;
  rightIcon?: boolean;
  leftIcon?: boolean;
  text?: string;

  /** Variant props */
  color?: CSSProperties["color"];
  state?: CSSProperties["state"];
  type?: CSSProperties["type"];
};

const ArrowUpCircle: FunctionComponent<ArrowUpCircleType> = ({
  className = "",
  color = "Blue",
  state = "Default",
  type = "Primary",
  rightIcon = true,
  leftIcon = false,
  text = "Acessar pedidos críticos",
}) => {
  return (
    <Box
      className={[styles.buttonMedium, className].join(" ")}
      data-color={color}
      data-state={state}
      data-type={type}
    >
      {!!leftIcon && (
        <img
          className={styles.arrowUpCircleIcon}
          alt=""
          src="/Arrow-up-circle.svg"
        />
      )}
      <div className={styles.medium}>{text}</div>
      {!!rightIcon && (
        <img
          className={styles.arrowUpRightIcon}
          alt=""
          src="/Arrow-Icon1.svg"
        />
      )}
    </Box>
  );
};

export default ArrowUpCircle;
