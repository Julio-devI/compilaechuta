import { FunctionComponent, useState, useCallback } from "react";
import { Box } from "@mui/material";
import Component6 from "../components/Component6";
import PieChart from "../components/PieChart";
import FrameComponent1 from "../components/FrameComponent1";
import TendnciasCards from "../components/TendnciasCards";
import Divrounded2xl from "../components/Divrounded2xl";
import Container from "../components/Container";
import TittleInfoLightPopover from "../components/TittleInfoLightPopover";
import ButtonIA from "../components/ButtonIA";
import styles from "./Desktop.module.css";

const Desktop: FunctionComponent = () => {
  const [pieChartItems] = useState([
    {
      color: "Blue" as const,
      state: "Default" as const,
      type: "Secondary" as const,
      rightIcon: false,
      leftIcon: false,
      text: "Visão Geral",
      pieChart: "/Arrow-up-circle.svg",
    },
    {
      color: "Blue" as const,
      state: "Default" as const,
      type: "Secondary" as const,
      rightIcon: false,
      leftIcon: false,
      text: "Este Mês",
      pieChart: "/Arrow-up-circle.svg",
    },
    {
      color: "Blue" as const,
      state: "Default" as const,
      type: "Secondary" as const,
      rightIcon: false,
      leftIcon: false,
      text: "Últimos 30 Dias",
      pieChart: "/Arrow-up-circle.svg",
    },
    {
      color: "Blue" as const,
      state: "Default" as const,
      type: "Secondary" as const,
      rightIcon: false,
      leftIcon: false,
      text: "Trimestre",
      pieChart: "/Arrow-up-circle.svg",
    },
    {
      color: "Blue" as const,
      state: "Default" as const,
      type: "Secondary" as const,
      rightIcon: false,
      leftIcon: false,
      text: "Por Categoria",
      pieChart: "/Chevron-down.svg",
    },
    {
      color: "Blue" as const,
      state: "Default" as const,
      type: "Ghost" as const,
      rightIcon: false,
      leftIcon: false,
      text: "Escolher outros",
      pieChart: "/Arrow-up-circle.svg",
    },
  ]);
  const [divrounded2xlItems] = useState([
    {
      divrounded2xlGridColumn: "1" as const,
      spanh2BackgroundColor: "#ff3b3b" as const,
      detratores: "Detratores",
      trendValue: "12%",
      trendValueWidth: "43.3px" as const,
      trendValueDisplay: "flex" as const,
      trendValueAlignItems: "center" as const,
    },
    {
      divrounded2xlGridColumn: "2" as const,
      spanh2BackgroundColor: "#ffcc00" as const,
      detratores: "Neutros",
      trendValue: "18%",
      trendValueWidth: "unset" as const,
      trendValueDisplay: "unset" as const,
      trendValueAlignItems: "unset" as const,
    },
    {
      divrounded2xlGridColumn: "3" as const,
      spanh2BackgroundColor: "#0063f7" as const,
      detratores: "Promotores",
      trendValue: "70%",
      trendValueWidth: "unset" as const,
      trendValueDisplay: "unset" as const,
      trendValueAlignItems: "unset" as const,
    },
  ]);
  const [tittleInfoLightPopoverItems] = useState([
    {
      property1: "Default" as const,
      iconLeft: true,
      iconRight: true,
      popoverTitle: "Pedidos atrasados",
      infoExplainingMore: "655",
      iconePopoverProperty1: "type 1" as const,
      iconePopoverProperty11: "type 1" as const,
      iconePopoverLatePackage: "/late-package.svg",
      iconePopoverIconBackground: "rgba(255, 59, 59, 0.3)" as const,
      iconePopoverIconBackground1: "#fff" as const,
      iconePopoverIconBackground3: undefined,
    },
    {
      property1: "Default" as const,
      iconLeft: true,
      iconRight: true,
      popoverTitle: "Clientes com Tickets Abertos",
      infoExplainingMore: "42",
      iconePopoverProperty1: "type 1" as const,
      iconePopoverProperty11: "type 1" as const,
      iconePopoverLatePackage: "/Users.svg",
      iconePopoverIconBackground: "rgba(255, 204, 0, 0.3)" as const,
      iconePopoverIconBackground1: "#fff" as const,
      iconePopoverIconBackground3: undefined,
    },
    {
      property1: "Default" as const,
      iconLeft: true,
      iconRight: true,
      popoverTitle: "Exportar CSV",
      infoExplainingMore: "Mês atual",
      iconePopoverProperty1: "type 1" as const,
      iconePopoverProperty11: "type 1" as const,
      iconePopoverLatePackage: "/Download.svg",
      iconePopoverIconBackground: "rgba(0, 112, 219, 0.3)" as const,
      iconePopoverIconBackground1: "#fff" as const,
      iconePopoverIconBackground3: undefined,
    },
    {
      property1: "Default" as const,
      iconLeft: true,
      iconRight: true,
      popoverTitle: "Insights da IA",
      infoExplainingMore: "Info explaining more",
      iconePopoverProperty1: "type 1" as const,
      iconePopoverProperty11: "type 1" as const,
      iconePopoverLatePackage: "/sparkle.svg",
      iconePopoverIconBackground: "unset" as const,
      iconePopoverIconBackground1: "#fff" as const,
      iconePopoverIconBackground3: undefined,
    },
  ]);

  const onArrowUpCircleClick = useCallback(() => {
    // Please sync "desktop" to the project
  }, []);

  const onArrowUpCircleItemClick = useCallback((index: number) => {
    if (index === 1) {
      // onArrowUpCircleClick1();
    }
    if (index === 2) {
      // onArrowUpCircleClick1();
    }
    if (index === 3) {
      // onArrowUpCircleClick1();
    }
  }, []);
  return (
    <Box className={styles.desktop}>
      <Component6
        property1="Default"
        size="Small"
        status1="Default"
        type="Initials"
      />
      <Box className={styles.desktopInner}>
        <Box className={styles.dashboardParent}>
          <div className={styles.dashboard}>Dashboard</div>
          <Box className={styles.frameParent}>
            <Box className={styles.frameGroup}>
              <Box className={styles.frameWrapper}>
                <Box className={styles.buttonSmallParent}>
                  {pieChartItems.map((item, index) => (
                    <PieChart
                      key={index}
                      color={item.color}
                      state={item.state}
                      type={item.type}
                      rightIcon={item.rightIcon}
                      leftIcon={item.leftIcon}
                      text={item.text}
                      pieChart={item.pieChart}
                      onArrowUpCircleClick={() =>
                        onArrowUpCircleItemClick(index)
                      }
                    />
                  ))}
                </Box>
              </Box>
              <Box className={styles.instanceParent}>
                <FrameComponent1 property1="Default" />
                <Box className={styles.tendnciasCardsParent}>
                  <TendnciasCards property1="Default" />
                  <Box className={styles.frameContainer}>
                    <Box className={styles.frameDiv}>
                      <Box className={styles.frameWrapper2}>
                        <Box className={styles.frameParent2}>
                          <Box className={styles.frameWrapper3}>
                            <Box className={styles.frameParent3}>
                              <Box className={styles.trendingUpWrapper}>
                                <img
                                  className={styles.trendingUpIcon}
                                  alt=""
                                  src="/Trend-icon.svg"
                                />
                              </Box>
                              <div className={styles.cliente}>CLIENTE</div>
                            </Box>
                          </Box>
                          <div className={styles.taxaDeSatisfao}>
                            Taxa de Satisfação
                          </div>
                          <div className={styles.evoluoDeFaturamento}>
                            Evolução de faturamento — clique para detalhar
                          </div>
                        </Box>
                      </Box>
                      <Box className={styles.component1Parent}>
                        <img
                          className={styles.component1Icon}
                          alt=""
                          src="/Component-1.svg"
                        />
                        <div className={styles.divgrid}>
                          {divrounded2xlItems.map((item, index) => (
                            <Divrounded2xl
                              key={index}
                              divrounded2xlGridColumn={
                                item.divrounded2xlGridColumn
                              }
                              spanh2BackgroundColor={item.spanh2BackgroundColor}
                              detratores={item.detratores}
                              trendValue={item.trendValue}
                              trendValueWidth={item.trendValueWidth}
                              trendValueDisplay={item.trendValueDisplay}
                              trendValueAlignItems={item.trendValueAlignItems}
                            />
                          ))}
                        </div>
                      </Box>
                    </Box>
                  </Box>
                </Box>
                <Box className={styles.reportContainerParent}>
                  <Box className={styles.reportContainer}>
                    <Container property1="Default" property11="Default" />
                  </Box>
                  <Box className={styles.frameWrapper4}>
                    <Box className={styles.frameDiv}>
                      <Box className={styles.actionTitles}>
                        <Box className={styles.frameParent2}>
                          <Box className={styles.actionHeaderWrapper}>
                            <Box className={styles.actionHeader}>
                              <div className={styles.aesRpidas}>
                                AÇÕES RÁPIDAS
                              </div>
                            </Box>
                          </Box>
                          <div className={styles.atalhosContextuais}>
                            Atalhos contextuais
                          </div>
                        </Box>
                      </Box>
                      <Box className={styles.shortcutGrid}>
                        {tittleInfoLightPopoverItems.map((item, index) => (
                          <TittleInfoLightPopover
                            key={index}
                            property1={item.property1}
                            iconLeft={item.iconLeft}
                            iconRight={item.iconRight}
                            popoverTitle={item.popoverTitle}
                            infoExplainingMore={item.infoExplainingMore}
                            iconePopoverProperty1={item.iconePopoverProperty1}
                            iconePopoverProperty11={item.iconePopoverProperty11}
                            iconePopoverLatePackage={
                              item.iconePopoverLatePackage
                            }
                            iconePopoverIconBackground={
                              item.iconePopoverIconBackground
                            }
                            iconePopoverIconBackground1={
                              item.iconePopoverIconBackground1
                            }
                            iconePopoverIconBackground3={
                              item.iconePopoverIconBackground3
                            }
                          />
                        ))}
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
            <ButtonIA property1="Default" />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Desktop;
